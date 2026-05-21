/**
 * WebSocket server — room-based pub/sub for browser real-time.
 *
 * Rooms:
 *   fleet:live                   — all vehicle positions (Control Tower map)
 *   vehicle:{id}                 — single vehicle telemetry
 *   journey:{id}:live            — active journey tracking
 *   events:severity:critical     — HSE console (panic, collision)
 *   notifications:{userId}       — in-app notifications
 *
 * Auth: JWT token in query param or first message.
 * Fan-out: Redis pub/sub → WebSocket rooms.
 */
import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { verifyAccessToken, type JwtPayload } from '../../modules/auth/auth.service.js';
import { redisSub } from '../../infra/redis/client.js';

interface WsClient {
  socket: WebSocket;
  user: JwtPayload;
  rooms: Set<string>;
}

const clients = new Set<WsClient>();
const roomSubscriptions = new Map<string, Set<WsClient>>();

// Track which Redis channels we're subscribed to
const subscribedChannels = new Set<string>();

export async function initWebSocket(app: FastifyInstance) {
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket, request) => {
    // Auth via query param
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Missing token');
      return;
    }

    let user: JwtPayload;
    try {
      user = verifyAccessToken(token);
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    const client: WsClient = { socket, user, rooms: new Set() };
    clients.add(client);

    app.log.info({ userId: user.sub, email: user.email }, 'WebSocket client connected');

    socket.on('message', (raw) => {
      const msg = (() => {
        try { return JSON.parse(raw.toString()); } catch { return null; }
      })();
      if (!msg) { socket.send(JSON.stringify({ error: 'Invalid message format' })); return; }
      handleClientMessage(app, client, msg).catch((err) => {
        app.log.error({ err }, 'WS message handler error');
      });
    });

    socket.on('close', () => {
      // Remove from all rooms
      for (const room of client.rooms) {
        leaveRoom(client, room);
      }
      clients.delete(client);
      app.log.info({ userId: user.sub }, 'WebSocket client disconnected');
    });
  });

  // Subscribe to Redis pub/sub and fan out to WebSocket rooms
  redisSub.on('message', (channel, message) => {
    const room = roomSubscriptions.get(channel);
    if (!room || room.size === 0) return;

    const payload = JSON.stringify({ room: channel, data: JSON.parse(message) });
    for (const client of room) {
      if (client.socket.readyState === 1) { // WebSocket.OPEN
        client.socket.send(payload);
      }
    }
  });
}

async function handleClientMessage(app: FastifyInstance, client: WsClient, msg: { action: string; room?: string }) {
  switch (msg.action) {
    case 'subscribe':
      if (msg.room) await joinRoom(app, client, msg.room);
      break;
    case 'unsubscribe':
      if (msg.room) leaveRoom(client, msg.room);
      break;
    case 'ping':
      client.socket.send(JSON.stringify({ action: 'pong' }));
      break;
  }
}

async function joinRoom(app: FastifyInstance, client: WsClient, room: string) {
  // Validate room access based on user role/permissions
  if (!canAccessRoom(client.user, room)) {
    client.socket.send(JSON.stringify({ error: `Access denied to room: ${room}` }));
    return;
  }

  client.rooms.add(room);

  if (!roomSubscriptions.has(room)) {
    roomSubscriptions.set(room, new Set());
  }
  roomSubscriptions.get(room)!.add(client);

  // Subscribe to Redis channel if first client in this room
  // Await so the subscription is confirmed before sending the ack
  if (!subscribedChannels.has(room)) {
    subscribedChannels.add(room);
    try {
      await redisSub.subscribe(room);
    } catch (err) {
      app.log.error({ err, room }, 'Redis subscribe failed');
      subscribedChannels.delete(room);
    }
  }

  // Send ack only after Redis subscription is confirmed
  client.socket.send(JSON.stringify({ action: 'subscribed', room }));
}

function leaveRoom(client: WsClient, room: string) {
  client.rooms.delete(room);

  const roomClients = roomSubscriptions.get(room);
  if (roomClients) {
    roomClients.delete(client);

    // Unsubscribe from Redis if no clients in room
    if (roomClients.size === 0) {
      roomSubscriptions.delete(room);
      subscribedChannels.delete(room);
      redisSub.unsubscribe(room).catch(() => {});
    }
  }
}

function canAccessRoom(user: JwtPayload, room: string): boolean {
  // Admin can access everything
  if (user.role === 'admin') return true;

  // HSE can access critical events
  if (room === 'events:severity:critical' && (user.role === 'hse' || user.role === 'gm')) return true;

  // Fleet live — all ops roles
  if (room === 'fleet:live') return true;

  // Vehicle/journey specific rooms — all authenticated users
  if (room.startsWith('vehicle:') || room.startsWith('journey:')) return true;

  // Notification room — only own notifications
  if (room.startsWith('notifications:') && room === `notifications:${user.sub}`) return true;

  return false;
}

/**
 * Get current connection stats.
 */
export function getWsStats() {
  return {
    clients: clients.size,
    rooms: Object.fromEntries(
      Array.from(roomSubscriptions.entries()).map(([room, cls]) => [room, cls.size]),
    ),
  };
}
