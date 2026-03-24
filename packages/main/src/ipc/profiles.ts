import { ipcMain } from 'electron';
import {
  listProfiles,
  createProfile,
  verifyPin,
  switchProfile,
  deleteProfile,
  getActiveProfile,
  getProfileDataDir,
  updateProfileAvatar,
  updateProfileName,
  updateProfileUnreadCount,
} from '../services/profile-manager';
import { initDatabase, closeDatabase, runMigrations } from '../db/database';
import { seedDatabase } from '../db/seed';
import { getDatabase } from '../db/database';

export function registerProfileHandlers(): void {
  ipcMain.handle('profile:list', () => {
    return listProfiles();
  });

  ipcMain.handle('profile:create', async (_event, name: string, color: string, pin: string) => {
    try {
      const profile = createProfile(name, color, pin);
      return { success: true, profile };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('profile:verify-pin', (_event, profileId: string, pin: string) => {
    return verifyPin(profileId, pin);
  });

  ipcMain.handle('profile:switch', async (_event, profileId: string) => {
    const ok = switchProfile(profileId);
    if (!ok) return { success: false, error: 'Profile not found' };

    // Reinitialize database for the new profile's directory
    try {
      closeDatabase();
      const profileDir = getProfileDataDir(profileId);
      await initDatabase(profileDir);
      runMigrations();
      const db = getDatabase();
      seedDatabase(db);

      // Sync profile name to the user_profile table so the browser shows the right name
      const profile = listProfiles().find((p: any) => p.id === profileId);
      if (profile) {
        try {
          db.prepare('UPDATE user_profile SET display_name = ? WHERE id = 1').run(profile.name);
        } catch { /* column might not exist yet — non-critical */ }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('profile:delete', (_event, profileId: string, pin: string) => {
    const ok = deleteProfile(profileId, pin);
    return { success: ok, error: ok ? undefined : 'Invalid PIN or profile not found' };
  });

  ipcMain.handle('profile:get-active', () => {
    return getActiveProfile();
  });

  ipcMain.handle('profile:update-avatar', (_event, profileId: string, avatarUrl: string) => {
    return { success: updateProfileAvatar(profileId, avatarUrl) };
  });

  ipcMain.handle('profile:update-name', (_event, profileId: string, name: string) => {
    return { success: updateProfileName(profileId, name) };
  });

  ipcMain.handle('profile:update-unread', (_event, profileId: string, count: number) => {
    return { success: updateProfileUnreadCount(profileId, count) };
  });
}
