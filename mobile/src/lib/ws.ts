import { storage } from './storage';

let socket: WebSocket | null = null;
const listeners = new Map<string, Set<(data: unknown) => void>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWs() {
  if (socket?.readyState === WebSocket.OPEN) return;

  const token = storage.getString('accessToken');
  if (!token) return;

  const wsUrl = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000/ws';
  socket = new WebSocket(`${wsUrl}?token=${token}`);

  socket.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string);
      if (msg.room) {
        const roomListeners = listeners.get(msg.room);
        if (roomListeners) {
          for (const cb of roomListeners) cb(msg.data);
        }
      }
    } catch {}
  };

  socket.onclose = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWs, 3000);
  };

  socket.onerror = () => {
    socket?.close();
  };
}

export function subscribe(room: string, callback: (data: unknown) => void) {
  if (!listeners.has(room)) listeners.set(room, new Set());
  listeners.get(room)!.add(callback);

  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'subscribe', room }));
  }

  return () => {
    listeners.get(room)?.delete(callback);
    if (listeners.get(room)?.size === 0) {
      listeners.delete(room);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'unsubscribe', room }));
      }
    }
  };
}

export function disconnectWs() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
  listeners.clear();
}
