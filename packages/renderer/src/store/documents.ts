import { create } from 'zustand';

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  category: 'personal' | 'official' | 'shared';
  tags: string[];
  createdAt: number;
  lastOpenedAt: number;
  annotation?: string;
  stamp?: 'approved' | 'rejected' | 'draft' | 'reviewed' | null;
}

interface DocumentsState {
  documents: Document[];
  searchQuery: string;
  selectedCategory: 'all' | 'personal' | 'official' | 'shared';
  sortBy: 'name' | 'date' | 'size' | 'type';

  addDocument: (file: File) => Promise<void>;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  setStamp: (id: string, stamp: Document['stamp']) => void;
  setSearchQuery: (query: string) => void;
  setCategory: (cat: DocumentsState['selectedCategory']) => void;
  setSortBy: (sort: DocumentsState['sortBy']) => void;
  openDocument: (id: string) => void;
  getTotalSize: () => number;
  getFilteredDocuments: () => Document[];
}

const STORAGE_KEY = 'os-browser-documents';
const MAX_STORAGE_BYTES = 100 * 1024 * 1024; // 100MB

function loadFromStorage(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveToStorage(docs: Document[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // storage full
  }
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    pdf: 'pdf',
    doc: 'doc', docx: 'doc',
    xls: 'xls', xlsx: 'xls',
    ppt: 'ppt', pptx: 'ppt',
    txt: 'txt', csv: 'txt', json: 'txt',
    png: 'img', jpg: 'img', jpeg: 'img', gif: 'img', webp: 'img', svg: 'img', bmp: 'img',
    mp3: 'audio', wav: 'audio', ogg: 'audio',
    mp4: 'video', webm: 'video', mov: 'video',
    zip: 'archive', rar: 'archive', '7z': 'archive',
  };
  return typeMap[ext] || 'other';
}

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: loadFromStorage(),
  searchQuery: '',
  selectedCategory: 'all',
  sortBy: 'date',

  addDocument: async (file: File) => {
    const { documents } = get();
    const currentSize = documents.reduce((sum, d) => sum + d.size, 0);

    if (currentSize + file.size > MAX_STORAGE_BYTES) {
      throw new Error(`Storage limit reached. Current: ${(currentSize / 1024 / 1024).toFixed(1)}MB, File: ${(file.size / 1024 / 1024).toFixed(1)}MB, Limit: 100MB`);
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    const doc: Document = {
      id: generateId(),
      name: file.name,
      type: getFileType(file.name),
      size: file.size,
      dataUrl,
      category: 'personal',
      tags: [],
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      stamp: null,
    };

    const updated = [...documents, doc];
    saveToStorage(updated);
    set({ documents: updated });
  },

  removeDocument: (id: string) => {
    set((s) => {
      const updated = s.documents.filter((d) => d.id !== id);
      saveToStorage(updated);
      return { documents: updated };
    });
  },

  updateDocument: (id: string, updates: Partial<Document>) => {
    set((s) => {
      const updated = s.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      );
      saveToStorage(updated);
      return { documents: updated };
    });
  },

  setStamp: (id: string, stamp: Document['stamp']) => {
    get().updateDocument(id, { stamp });
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setCategory: (cat) => set({ selectedCategory: cat }),
  setSortBy: (sort) => set({ sortBy: sort }),

  openDocument: (id: string) => {
    const { documents } = get();
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;

    get().updateDocument(id, { lastOpenedAt: Date.now() });

    // For PDFs and images, open in a new browser tab
    if (doc.type === 'pdf' || doc.type === 'img') {
      const blob = dataUrlToBlob(doc.dataUrl);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      // For other types, trigger a download
      downloadDocument(doc);
    }
  },

  getTotalSize: () => {
    return get().documents.reduce((sum, d) => sum + d.size, 0);
  },

  getFilteredDocuments: () => {
    const { documents, searchQuery, selectedCategory, sortBy } = get();

    let filtered = [...documents];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.annotation?.toLowerCase().includes(q),
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((d) => d.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'size':
        filtered.sort((a, b) => b.size - a.size);
        break;
      case 'type':
        filtered.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    return filtered;
  },
}));

// Helpers
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export function downloadDocument(doc: Document) {
  const blob = dataUrlToBlob(doc.dataUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
