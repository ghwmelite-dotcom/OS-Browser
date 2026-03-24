import { create } from 'zustand';

export type RecordingQuality = '720p' | '1080p';

export interface SavedRecording {
  id: string;
  title: string;
  duration: number;
  fileSize: number;
  createdAt: string;
  mimeType: string;
  quality: string;
  hasMic: boolean;
}

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // seconds
  mode: 'tab' | 'window' | null;
  isAnnotating: boolean;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];

  // Enhanced features
  micEnabled: boolean;
  quality: RecordingQuality;
  micStream: MediaStream | null;
  savedRecordings: SavedRecording[];
  showLibrary: boolean;
  lastSavedRecording: SavedRecording | null;
  showPostRecordingToast: boolean;

  startRecording: (mode: 'tab' | 'window') => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  toggleAnnotation: () => void;
  tick: () => void;
  reset: () => void;
  setMediaRecorder: (recorder: MediaRecorder | null) => void;
  addChunk: (chunk: Blob) => void;

  // Enhanced actions
  setMicEnabled: (enabled: boolean) => void;
  setQuality: (quality: RecordingQuality) => void;
  setMicStream: (stream: MediaStream | null) => void;
  loadRecordings: () => Promise<void>;
  setShowLibrary: (show: boolean) => void;
  setLastSavedRecording: (recording: SavedRecording | null) => void;
  setShowPostRecordingToast: (show: boolean) => void;
  deleteRecording: (id: string) => Promise<void>;
  renameRecording: (id: string, newTitle: string) => Promise<void>;
}

export const useRecorderStore = create<RecorderState>((set, get) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  mode: null,
  isAnnotating: false,
  mediaRecorder: null,
  chunks: [],

  micEnabled: false,
  quality: '720p',
  micStream: null,
  savedRecordings: [],
  showLibrary: false,
  lastSavedRecording: null,
  showPostRecordingToast: false,

  startRecording: (mode) =>
    set({
      isRecording: true,
      isPaused: false,
      duration: 0,
      mode,
      isAnnotating: false,
      chunks: [],
    }),

  stopRecording: () => {
    const { mediaRecorder, micStream } = get();
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    // Clean up mic stream
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
    }
    set({
      isRecording: false,
      isPaused: false,
      mode: null,
      isAnnotating: false,
      mediaRecorder: null,
      micStream: null,
    });
  },

  pauseRecording: () => {
    const { mediaRecorder } = get();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
    }
    set({ isPaused: true });
  },

  resumeRecording: () => {
    const { mediaRecorder } = get();
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
    }
    set({ isPaused: false });
  },

  toggleAnnotation: () =>
    set((s) => ({ isAnnotating: !s.isAnnotating })),

  tick: () =>
    set((s) => ({ duration: s.duration + 1 })),

  reset: () =>
    set({
      isRecording: false,
      isPaused: false,
      duration: 0,
      mode: null,
      isAnnotating: false,
      mediaRecorder: null,
      chunks: [],
      micStream: null,
    }),

  setMediaRecorder: (recorder) =>
    set({ mediaRecorder: recorder }),

  addChunk: (chunk) =>
    set((s) => ({ chunks: [...s.chunks, chunk] })),

  setMicEnabled: (enabled) => set({ micEnabled: enabled }),
  setQuality: (quality) => set({ quality }),
  setMicStream: (stream) => set({ micStream: stream }),

  loadRecordings: async () => {
    try {
      const recordings = await (window as any).osBrowser?.recordings?.list();
      if (Array.isArray(recordings)) {
        set({ savedRecordings: recordings });
      }
    } catch {
      // silently fail
    }
  },

  setShowLibrary: (show) => set({ showLibrary: show }),
  setLastSavedRecording: (recording) => set({ lastSavedRecording: recording }),
  setShowPostRecordingToast: (show) => set({ showPostRecordingToast: show }),

  deleteRecording: async (id) => {
    try {
      await (window as any).osBrowser?.recordings?.delete(id);
      set((s) => ({
        savedRecordings: s.savedRecordings.filter(r => r.id !== id),
      }));
    } catch {
      // silently fail
    }
  },

  renameRecording: async (id, newTitle) => {
    try {
      const result = await (window as any).osBrowser?.recordings?.rename(id, newTitle);
      if (result?.success) {
        set((s) => ({
          savedRecordings: s.savedRecordings.map(r =>
            r.id === id ? { ...r, title: newTitle } : r
          ),
        }));
      }
    } catch {
      // silently fail
    }
  },
}));
