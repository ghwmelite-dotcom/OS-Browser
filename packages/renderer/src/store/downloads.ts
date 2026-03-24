import { create } from 'zustand';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  state: string;
  speed: number;
  eta: number;
  savePath: string;
  startedAt: number;
}

interface DownloadState {
  downloads: DownloadItem[];
  init: () => () => void; // returns cleanup function
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  clearCompleted: () => void;
  activeCount: () => number;
}

/** Compute ETA from speed + remaining bytes */
function computeEta(dl: Omit<DownloadItem, 'eta'>): number {
  if (dl.speed <= 0 || dl.totalBytes <= 0) return 0;
  return Math.round((dl.totalBytes - dl.receivedBytes) / dl.speed);
}

function upsertDownload(
  downloads: DownloadItem[],
  incoming: any,
): DownloadItem[] {
  if (!incoming || !incoming.id) return downloads;
  const eta = computeEta(incoming);
  const item: DownloadItem = {
    id: incoming.id,
    filename: incoming.filename ?? '',
    url: incoming.url ?? '',
    totalBytes: incoming.totalBytes ?? 0,
    receivedBytes: incoming.receivedBytes ?? 0,
    state: incoming.state ?? 'downloading',
    speed: incoming.speed ?? 0,
    eta,
    savePath: incoming.savePath ?? '',
    startedAt: incoming.startedAt ?? Date.now(),
  };

  const idx = downloads.findIndex(d => d.id === item.id);
  if (idx >= 0) {
    const next = [...downloads];
    next[idx] = item;
    return next;
  }
  return [...downloads, item];
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],

  init: () => {
    const api = (window as any).osBrowser?.downloads;
    if (!api) return () => {};

    // Load existing downloads on init
    api.list().then((list: any[]) => {
      if (Array.isArray(list)) {
        set({
          downloads: list.map((d: any) => ({
            ...d,
            eta: computeEta(d),
          })),
        });
      }
    });

    const unsubs: (() => void)[] = [];

    unsubs.push(
      api.onStarted((data: any) => {
        set(s => ({ downloads: upsertDownload(s.downloads, data) }));
      }),
    );

    unsubs.push(
      api.onProgress((data: any) => {
        set(s => ({ downloads: upsertDownload(s.downloads, data) }));
      }),
    );

    unsubs.push(
      api.onComplete((data: any) => {
        set(s => ({ downloads: upsertDownload(s.downloads, { ...data, state: 'completed', speed: 0 }) }));
      }),
    );

    unsubs.push(
      api.onFailed((data: any) => {
        if (!data || !data.id) {
          // null payload = list refresh (from clear-completed)
          api.list().then((list: any[]) => {
            if (Array.isArray(list)) {
              set({ downloads: list.map((d: any) => ({ ...d, eta: computeEta(d) })) });
            }
          });
          return;
        }
        set(s => ({ downloads: upsertDownload(s.downloads, { ...data, speed: 0 }) }));
      }),
    );

    return () => unsubs.forEach(fn => fn());
  },

  pauseDownload: (id) => {
    (window as any).osBrowser?.downloads?.pause(id);
  },

  resumeDownload: (id) => {
    (window as any).osBrowser?.downloads?.resume(id);
  },

  cancelDownload: (id) => {
    (window as any).osBrowser?.downloads?.cancel(id);
  },

  retryDownload: (id) => {
    (window as any).osBrowser?.downloads?.retry(id);
  },

  clearCompleted: () => {
    (window as any).osBrowser?.downloads?.clearCompleted();
    set(s => ({
      downloads: s.downloads.filter(
        d => d.state === 'downloading' || d.state === 'paused',
      ),
    }));
  },

  activeCount: () => {
    return get().downloads.filter(d => d.state === 'downloading' || d.state === 'paused').length;
  },
}));
