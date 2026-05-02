// Service-worker registration + replay coordination. The SW caches the shell
// for offline; the page itself does mutation replay (since it has the
// authenticated Supabase client).

export async function registerSW(onReplay: () => void) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'replay-queue') onReplay();
    });
    // Best-effort: ask for background sync permission. SyncManager isn't
    // universally available; the app still replays on the 'online' event.
    if ('sync' in reg) {
      try { await (reg as any).sync.register('replay-queue'); } catch { /* ok */ }
    }
  } catch (err) {
    console.warn('SW registration failed', err);
  }
}
