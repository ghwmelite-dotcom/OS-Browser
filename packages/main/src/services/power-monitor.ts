import { powerMonitor, ipcMain, BrowserWindow } from 'electron';

// ── Types ──────────────────────────────────────────────────────────────
interface PowerStatus {
  isOnBattery: boolean;
  batteryLevel: number;
  powerSaverEnabled: boolean;
}

// ── PowerMonitorService ────────────────────────────────────────────────
class PowerMonitorService {
  private isOnBattery: boolean = false;
  private batteryLevel: number = 100;
  private powerSaverEnabled: boolean = false;
  private mainWindow: BrowserWindow | null = null;

  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    // Listen for power source changes
    powerMonitor.on('on-battery', () => {
      this.isOnBattery = true;
      // Auto-enable power saver when switching to battery
      if (!this.powerSaverEnabled) {
        this.powerSaverEnabled = true;
      }
      this.notifyRenderer();
    });

    powerMonitor.on('on-ac', () => {
      this.isOnBattery = false;
      this.notifyRenderer();
    });

    powerMonitor.on('shutdown', () => {
      // Emit an urgent save event before shutdown
      this.sendToRenderer('power:emergency-save', { reason: 'shutdown' });
    });

    powerMonitor.on('lock-screen', () => {
      // Emit save event on lock — user might be stepping away during dumsor
      this.sendToRenderer('power:emergency-save', { reason: 'lock-screen' });
    });

    // Try to detect initial battery state
    this.detectBatteryLevel();
    // Poll battery level periodically (every 60s)
    setInterval(() => this.detectBatteryLevel(), 60_000);

    // Register IPC handlers
    ipcMain.handle('power:get-status', (): PowerStatus => ({
      isOnBattery: this.isOnBattery,
      batteryLevel: this.batteryLevel,
      powerSaverEnabled: this.powerSaverEnabled,
    }));

    ipcMain.handle('power:toggle-saver', (): PowerStatus => {
      this.powerSaverEnabled = !this.powerSaverEnabled;
      this.notifyRenderer();
      return {
        isOnBattery: this.isOnBattery,
        batteryLevel: this.batteryLevel,
        powerSaverEnabled: this.powerSaverEnabled,
      };
    });
  }

  private async detectBatteryLevel(): Promise<void> {
    try {
      // powerMonitor.isOnBatteryPower() is available in Electron 30+
      if (typeof powerMonitor.isOnBatteryPower === 'function') {
        this.isOnBattery = powerMonitor.isOnBatteryPower();
      }
    } catch {
      // Not all platforms support this — silently ignore
    }

    // Battery level isn't directly available from Electron's powerMonitor API.
    // We use the system idle state as a proxy — if the system reports a battery
    // level through the renderer (navigator.getBattery()), we accept it via IPC.
    // For now, we keep the last known level or default to 100.
  }

  private notifyRenderer(): void {
    this.sendToRenderer('power:status-changed', {
      isOnBattery: this.isOnBattery,
      batteryLevel: this.batteryLevel,
      powerSaverEnabled: this.powerSaverEnabled,
    });
  }

  private sendToRenderer(channel: string, data: any): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, data);
      }
    } catch {
      // Window may have been destroyed
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────
let service: PowerMonitorService | null = null;

export function initPowerMonitor(mainWindow: BrowserWindow): void {
  service = new PowerMonitorService();
  service.initialize(mainWindow);
}

export function getPowerMonitor(): PowerMonitorService | null {
  return service;
}
