import { getJSON, setJSON } from './storage';
import { api } from './api';
import NetInfo from '@react-native-community/netinfo';

interface QueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: unknown;
  retries: number;
  createdAt: string;
}

const QUEUE_KEY = 'sync:queue';
const MAX_RETRIES = 3;

export function enqueue(item: Omit<QueueItem, 'id' | 'retries' | 'createdAt'>): void {
  const queue = getJSON<QueueItem[]>(QUEUE_KEY) ?? [];
  queue.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    retries: 0,
    createdAt: new Date().toISOString(),
  });
  setJSON(QUEUE_KEY, queue);
}

export async function flushQueue(): Promise<void> {
  const queue = getJSON<QueueItem[]>(QUEUE_KEY) ?? [];
  if (queue.length === 0) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const remaining: QueueItem[] = [];

  for (const item of queue) {
    try {
      await api({ method: item.method, url: item.endpoint, data: item.payload });
    } catch {
      if (item.retries < MAX_RETRIES) {
        remaining.push({ ...item, retries: item.retries + 1 });
      }
    }
  }

  setJSON(QUEUE_KEY, remaining);
}

export function startSyncListener(): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      flushQueue();
    }
  });
}
