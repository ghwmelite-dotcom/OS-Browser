import { create } from 'zustand';

interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string | null;
  folder_id: number | null;
  favicon_path: string | null;
  position: number;
}

interface BookmarkFolder {
  id: number;
  name: string;
  parent_id: number | null;
  position: number;
}

interface BookmarksState {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  loadBookmarks: () => Promise<void>;
  addBookmark: (data: { url: string; title: string; folder_id?: number }) => Promise<void>;
  removeBookmark: (id: number) => Promise<void>;
  isBookmarked: (url: string) => Promise<boolean>;
  createFolder: (data: { name: string; parent_id?: number }) => Promise<void>;
}

export const useBookmarksStore = create<BookmarksState>((set) => ({
  bookmarks: [],
  folders: [],
  loadBookmarks: async () => {
    const data = await window.osBrowser.bookmarks.list();
    set({ bookmarks: data.bookmarks || data, folders: data.folders || [] });
  },
  addBookmark: async (data) => {
    await window.osBrowser.bookmarks.add(data);
    const all = await window.osBrowser.bookmarks.list();
    set({ bookmarks: all.bookmarks || all, folders: all.folders || [] });
  },
  removeBookmark: async (id) => {
    await window.osBrowser.bookmarks.delete(id);
    set((s) => ({ bookmarks: s.bookmarks.filter(b => b.id !== id) }));
  },
  isBookmarked: async (url) => {
    return await window.osBrowser.bookmarks.isBookmarked(url);
  },
  createFolder: async (data) => {
    await window.osBrowser.bookmarks.createFolder(data);
    const all = await window.osBrowser.bookmarks.list();
    set({ folders: all.folders || [] });
  },
}));
