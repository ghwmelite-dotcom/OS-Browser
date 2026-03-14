import { dialog, BrowserWindow, ipcMain } from 'electron';
import { getDatabase } from '../db/database';
import fs from 'fs';

interface ImportedBookmark {
  title: string;
  url: string;
  folder?: string;
}

function parseNetscapeBookmarks(html: string): ImportedBookmark[] {
  const bookmarks: ImportedBookmark[] = [];
  let currentFolder = '';

  const lines = html.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect folder headers: <DT><H3...>Folder Name</H3>
    const folderMatch = trimmed.match(/<H3[^>]*>([^<]+)<\/H3>/i);
    if (folderMatch) {
      currentFolder = folderMatch[1].trim();
      continue;
    }

    // Detect bookmarks: <DT><A HREF="url"...>Title</A>
    const bookmarkMatch = trimmed.match(/<A\s+HREF="([^"]+)"[^>]*>([^<]*)<\/A>/i);
    if (bookmarkMatch) {
      const url = bookmarkMatch[1].trim();
      const title = bookmarkMatch[2].trim() || url;

      // Skip javascript: and data: URLs
      if (url.startsWith('javascript:') || url.startsWith('data:')) continue;

      bookmarks.push({
        title,
        url,
        folder: currentFolder || undefined,
      });
    }

    // Detect folder close
    if (trimmed === '</DL><p>' || trimmed === '</DL>') {
      currentFolder = '';
    }
  }

  return bookmarks;
}

export function registerBookmarkImportHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('bookmark:import', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Bookmarks',
      filters: [{ name: 'Bookmark Files', extensions: ['html', 'htm'] }],
      properties: ['openFile'],
    });

    if (filePaths.length === 0) return { imported: 0 };

    const html = fs.readFileSync(filePaths[0], 'utf-8');
    const bookmarks = parseNetscapeBookmarks(html);

    if (bookmarks.length === 0) return { imported: 0 };

    const db = getDatabase();

    // Create folders and insert bookmarks
    const folderCache = new Map<string, number>();

    const insertFolder = db.prepare(
      'INSERT OR IGNORE INTO bookmark_folders (name, position) VALUES (?, ?)'
    );
    const getFolder = db.prepare(
      'SELECT id FROM bookmark_folders WHERE name = ?'
    );
    const insertBookmark = db.prepare(
      'INSERT INTO bookmarks (url, title, folder_id, position) VALUES (?, ?, ?, ?)'
    );

    let position = (db.prepare('SELECT MAX(position) as max FROM bookmarks').get() as any)?.max + 1 || 0;

    const importAll = db.transaction(() => {
      for (const bm of bookmarks) {
        let folderId: number | null = null;

        if (bm.folder) {
          if (folderCache.has(bm.folder)) {
            folderId = folderCache.get(bm.folder)!;
          } else {
            insertFolder.run(bm.folder, folderCache.size);
            const row = getFolder.get(bm.folder) as any;
            if (row) {
              folderId = row.id;
              folderCache.set(bm.folder, folderId!);
            }
          }
        }

        insertBookmark.run(bm.url, bm.title, folderId, position++);
      }
    });

    importAll();

    return { imported: bookmarks.length, folders: folderCache.size };
  });
}
