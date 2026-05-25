'use client';

let socket: WebSocket | null = null;
let intentionalClose = false;
const listeners = new Map<string, Set<(data: unknown) => void>>();

export function connectWs() {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

  const token = localStorage.getItem('accessToken');
  if (!token) return;

  intentionalClose = false;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3000/ws';
  socket = new WebSocket(`${wsUrl}?token=${token}`);

  socket.onopen = () => {
    // Re-subscribe all active rooms after (re)connect
    for (const room of listeners.keys()) {
      socket!.send(JSON.stringify({ action: 'subscribe', room }));
    }
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.room) {
        const roomListeners = listeners.get(msg.room);
        if (roomListeners) {
          for (const cb of roomListeners) cb(msg.data);
        }
      }
      if (msg.action === 'pong') return;
    } catch { /* ignore malformed */ }
  };

  socket.onclose = () => {
    if (!intentionalClose) setTimeout(connectWs, 3000);
  };
}

export function subscribe(room: string, callback: (data: unknown) => void) {
  if (!listeners.has(room)) {
    listeners.set(room, new Set());
  }
  listeners.get(room)!.add(callback);

  // Send subscribe message if already open
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
  intentionalClose = true;
  socket?.close();
  socket = null;
  listeners.clear();
}
