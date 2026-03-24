import { ipcMain, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getProfileDataDir } from '../services/profile-manager';

export interface RecordingMeta {
  id: string;
  title: string;
  duration: number; // seconds
  fileSize: number; // bytes
  createdAt: string; // ISO
  mimeType: string;
  quality: string;
  hasMic: boolean;
}

function getRecordingsDir(): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dir = path.join(getProfileDataDir(), 'recordings', month);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getAllRecordingDirs(): string[] {
  const baseDir = path.join(getProfileDataDir(), 'recordings');
  if (!fs.existsSync(baseDir)) return [];
  try {
    return fs.readdirSync(baseDir)
      .map(d => path.join(baseDir, d))
      .filter(d => fs.statSync(d).isDirectory());
  } catch {
    return [];
  }
}

export function registerRecordingHandlers(mainWindow: BrowserWindow): void {
  // ── Save a recording ──
  ipcMain.handle('recording:save', async (_event, base64Data: string, metadata: {
    title?: string;
    duration: number;
    mimeType: string;
    quality?: string;
    hasMic?: boolean;
  }) => {
    if (typeof base64Data !== 'string' || base64Data.length > 500 * 1024 * 1024) {
      return { success: false, error: 'Recording too large' };
    }
    try {
      const id = crypto.randomUUID();
      const dir = getRecordingsDir();
      const videoPath = path.join(dir, `${id}.webm`);
      const metaPath = path.join(dir, `${id}.json`);

      // Write video file from base64
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(videoPath, buffer);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const meta: RecordingMeta = {
        id,
        title: metadata.title || `Recording ${timestamp}`,
        duration: metadata.duration || 0,
        fileSize: buffer.length,
        createdAt: new Date().toISOString(),
        mimeType: metadata.mimeType || 'video/webm',
        quality: metadata.quality || '720p',
        hasMic: metadata.hasMic || false,
      };

      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

      return { success: true, recording: meta };
    } catch (err: any) {
      console.error('[Recordings] Save failed:', err);
      return { success: false, error: err.message };
    }
  });

  // ── List all recordings ──
  ipcMain.handle('recording:list', async () => {
    try {
      const dirs = getAllRecordingDirs();
      const recordings: RecordingMeta[] = [];

      for (const dir of dirs) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
            const meta = JSON.parse(raw) as RecordingMeta;
            // Verify the video file still exists
            const videoPath = path.join(dir, `${meta.id}.webm`);
            if (fs.existsSync(videoPath)) {
              // Update fileSize in case it changed
              meta.fileSize = fs.statSync(videoPath).size;
              recordings.push(meta);
            }
          } catch {
            // Skip corrupt metadata files
          }
        }
      }

      // Sort newest first
      recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return recordings;
    } catch (err: any) {
      console.error('[Recordings] List failed:', err);
      return [];
    }
  });

  // ── Get recording file path ──
  ipcMain.handle('recording:get', async (_event, id: string) => {
    try {
      if (!id || typeof id !== 'string') return { success: false, error: 'Invalid id' };
      const dirs = getAllRecordingDirs();
      for (const dir of dirs) {
        const videoPath = path.join(dir, `${id}.webm`);
        const metaPath = path.join(dir, `${id}.json`);
        if (fs.existsSync(videoPath) && fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as RecordingMeta;
          // Read video as base64 for renderer playback
          const videoData = fs.readFileSync(videoPath).toString('base64');
          return { success: true, meta, videoData };
        }
      }
      return { success: false, error: 'Recording not found' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Delete recording ──
  ipcMain.handle('recording:delete', async (_event, id: string) => {
    try {
      if (!id || typeof id !== 'string') return { success: false, error: 'Invalid id' };
      const dirs = getAllRecordingDirs();
      for (const dir of dirs) {
        const videoPath = path.join(dir, `${id}.webm`);
        const metaPath = path.join(dir, `${id}.json`);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
          if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
          return { success: true };
        }
      }
      return { success: false, error: 'Recording not found' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Rename recording ──
  ipcMain.handle('recording:rename', async (_event, id: string, newTitle: string) => {
    try {
      if (!id || typeof id !== 'string') return { success: false, error: 'Invalid id' };
      if (!newTitle || typeof newTitle !== 'string' || newTitle.trim().length === 0) {
        return { success: false, error: 'Title is required' };
      }
      if (newTitle.length > 200) return { success: false, error: 'Title too long' };

      const dirs = getAllRecordingDirs();
      for (const dir of dirs) {
        const metaPath = path.join(dir, `${id}.json`);
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as RecordingMeta;
          meta.title = newTitle.trim();
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
          return { success: true, recording: meta };
        }
      }
      return { success: false, error: 'Recording not found' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Show recording in file explorer ──
  ipcMain.handle('recording:show-in-folder', async (_event, id: string) => {
    try {
      if (!id || typeof id !== 'string') return;
      const dirs = getAllRecordingDirs();
      for (const dir of dirs) {
        const videoPath = path.join(dir, `${id}.webm`);
        if (fs.existsSync(videoPath)) {
          shell.showItemInFolder(videoPath);
          return;
        }
      }
    } catch {
      // silently ignore
    }
  });

  // ── Open recording in system player ──
  ipcMain.handle('recording:open-external', async (_event, id: string) => {
    try {
      if (!id || typeof id !== 'string') return;
      const dirs = getAllRecordingDirs();
      for (const dir of dirs) {
        const videoPath = path.join(dir, `${id}.webm`);
        if (fs.existsSync(videoPath)) {
          shell.openPath(videoPath);
          return;
        }
      }
    } catch {
      // silently ignore
    }
  });
}
