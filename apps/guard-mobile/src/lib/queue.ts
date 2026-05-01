// Offline queue. The guard app is field-first — assume the connection is
// flaky. Every mutation is queued in localStorage and replayed when online.

interface QueueItem { id: string; kind: string; payload: unknown; created_at: string }
const KEY = 'stigg.field.queue.v1';

export function enqueue(kind: string, payload: unknown): QueueItem {
  const item: QueueItem = { id: crypto.randomUUID(), kind, payload, created_at: new Date().toISOString() };
  const list = read();
  list.push(item);
  localStorage.setItem(KEY, JSON.stringify(list));
  return item;
}

export function read(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as QueueItem[]; }
  catch { return []; }
}

export function remove(id: string) {
  const list = read().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clear() { localStorage.removeItem(KEY); }
