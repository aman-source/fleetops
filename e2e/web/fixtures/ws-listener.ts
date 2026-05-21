/**
 * WebSocket listener for E2E assertions.
 * Subscribes to a room and collects messages.
 */
import WebSocket from 'ws';

const WS_URL = process.env.TEST_WS_URL ?? 'ws://localhost:3100';

export interface WsRoom {
  messages: unknown[];
  close: () => void;
  waitFor: (
    predicate: (msg: unknown) => boolean,
    timeoutMs?: number,
  ) => Promise<unknown>;
}

export async function subscribeRoom(room: string, token: string): Promise<WsRoom> {
  const messages: unknown[] = [];

  const ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`WS subscribe timeout for room ${room}`)), 5000);

    ws.once('open', () => {
      // Subscribe to room (server protocol: action: 'subscribe')
      ws.send(JSON.stringify({ action: 'subscribe', room }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        messages.push(msg);
        // Wait for the server's 'subscribed' ack before resolving —
        // ensures Redis subscription is confirmed before we start publishing.
        if ((msg as { action?: string; room?: string }).action === 'subscribed' &&
            (msg as { action?: string; room?: string }).room === room) {
          clearTimeout(timer);
          resolve();
        }
      } catch {
        messages.push(data.toString());
      }
    });

    ws.once('error', (err) => { clearTimeout(timer); reject(err); });
  });

  function close() {
    ws.close();
  }

  function waitFor(
    predicate: (msg: unknown) => boolean,
    timeoutMs = 10_000,
  ): Promise<unknown> {
    // Check existing messages first
    const existing = messages.find(predicate);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.off('message', handler);
        reject(new Error(`waitFor timed out after ${timeoutMs}ms. Got ${messages.length} messages.`));
      }, timeoutMs);

      function handler(data: WebSocket.RawData) {
        try {
          const msg = JSON.parse(data.toString());
          if (predicate(msg)) {
            clearTimeout(timer);
            ws.off('message', handler);
            resolve(msg);
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.on('message', handler);
    });
  }

  return { messages, close, waitFor };
}
