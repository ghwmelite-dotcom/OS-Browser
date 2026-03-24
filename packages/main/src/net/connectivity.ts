import { BrowserWindow } from 'electron';
import { IPC } from '../../../shared/dist';
import type { ConnectivityState } from '../../../shared/dist';
import { processQueue } from '../services/offline-queue';

const API_BASE = 'https://os-browser-api.ghwmelite.workers.dev';
let currentStatus: ConnectivityState = 'online';
let checkInterval: NodeJS.Timeout | null = null;
let mainWindowRef: BrowserWindow | null = null;

async function checkConnectivity(): Promise<ConnectivityState> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API_BASE}/api/v1/health`, {
      signal: controller.signal,
    });

    return response.ok ? 'online' : 'intermittent';
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timeout);
  }
}

async function runCheck(): Promise<void> {
  const newStatus = await checkConnectivity();
  if (newStatus !== currentStatus) {
    const previousStatus = currentStatus;
    currentStatus = newStatus;
    mainWindowRef?.webContents.send(IPC.CONNECTIVITY_CHANGED, currentStatus);
    if (newStatus === 'online' && previousStatus !== 'online') {
      processQueue().catch(() => {});
    }
  }
}

export function initConnectivityMonitor(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  // Initial check
  runCheck();

  // Periodic checks every 30 seconds
  checkInterval = setInterval(runCheck, 30000);
}

export function getConnectivityStatus(): ConnectivityState {
  return currentStatus;
}

export function stopConnectivityMonitor(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
