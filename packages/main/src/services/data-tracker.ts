import { session, ipcMain, BrowserWindow } from 'electron';

// ── Types ──────────────────────────────────────────────────────────────
interface SiteDataUsage {
  hostname: string;
  bytesReceived: number;
  bytesSent: number;
  requestCount: number;
}

interface DataUsageResponse {
  totalBytesToday: number;
  topSites: SiteDataUsage[];
  costEstimate: number;
}

// ── Cost Constant ──────────────────────────────────────────────────────
// Average Ghana data cost: MTN GH₵20 for 3.5GB => ~GH₵5.71/GB
const GHS_PER_GB = 5.71;

// ── DataTracker ────────────────────────────────────────────────────────
class DataTracker {
  private siteUsage: Map<string, SiteDataUsage> = new Map();
  private totalBytesToday: number = 0;
  private lastResetDate: string = '';

  initialize(mainWindow: BrowserWindow): void {
    this.lastResetDate = this.todayKey();

    // Hook into completed requests to track bandwidth
    session.defaultSession.webRequest.onCompleted((details) => {
      this.checkDateRollover();

      // Extract hostname from URL
      let hostname: string;
      try {
        hostname = new URL(details.url).hostname;
      } catch {
        return; // Skip malformed URLs
      }

      // Skip internal/extension requests
      if (!hostname || hostname === 'localhost' || details.url.startsWith('chrome-extension://')) {
        return;
      }

      // Estimate response size from content-length header
      let responseBytes = 0;
      const headers = details.responseHeaders;
      if (headers) {
        const contentLength =
          headers['content-length'] ||
          headers['Content-Length'] ||
          headers['CONTENT-LENGTH'];
        if (contentLength && contentLength.length > 0) {
          const parsed = parseInt(contentLength[0], 10);
          if (!isNaN(parsed) && parsed > 0) {
            responseBytes = parsed;
          }
        }
      }

      // Fallback: estimate ~2KB for small requests without content-length
      if (responseBytes === 0) {
        responseBytes = 2048;
      }

      // Estimate request size (headers + small body estimate)
      const requestBytes = 512;

      // Accumulate
      this.totalBytesToday += responseBytes + requestBytes;

      const existing = this.siteUsage.get(hostname);
      if (existing) {
        existing.bytesReceived += responseBytes;
        existing.bytesSent += requestBytes;
        existing.requestCount += 1;
      } else {
        this.siteUsage.set(hostname, {
          hostname,
          bytesReceived: responseBytes,
          bytesSent: requestBytes,
          requestCount: 1,
        });
      }
    });

    // Register IPC handlers
    ipcMain.handle('data:get-usage', (): DataUsageResponse => {
      this.checkDateRollover();
      return {
        totalBytesToday: this.totalBytesToday,
        topSites: this.getTopSites(),
        costEstimate: this.getCostEstimate(this.totalBytesToday),
      };
    });

    ipcMain.handle('data:get-page-cost', (_event, url: string): number => {
      if (typeof url !== 'string') return 0;
      let hostname: string;
      try {
        hostname = new URL(url).hostname;
      } catch {
        return 0;
      }
      const site = this.siteUsage.get(hostname);
      return site ? site.bytesReceived + site.bytesSent : 0;
    });

    ipcMain.handle('data:reset', () => {
      this.resetCounters();
    });
  }

  getTopSites(): SiteDataUsage[] {
    return Array.from(this.siteUsage.values())
      .sort((a, b) => (b.bytesReceived + b.bytesSent) - (a.bytesReceived + a.bytesSent))
      .slice(0, 10);
  }

  getCostEstimate(bytes: number): number {
    const gb = bytes / (1024 * 1024 * 1024);
    return parseFloat((gb * GHS_PER_GB).toFixed(4));
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private checkDateRollover(): void {
    const today = this.todayKey();
    if (today !== this.lastResetDate) {
      this.resetCounters();
      this.lastResetDate = today;
    }
  }

  private resetCounters(): void {
    this.siteUsage.clear();
    this.totalBytesToday = 0;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────
let tracker: DataTracker | null = null;

export function initDataTracker(mainWindow: BrowserWindow): void {
  tracker = new DataTracker();
  tracker.initialize(mainWindow);
}

export function getDataTracker(): DataTracker | null {
  return tracker;
}
