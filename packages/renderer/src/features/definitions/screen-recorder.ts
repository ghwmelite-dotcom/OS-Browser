import { Video } from 'lucide-react';
import { FeatureRegistry } from '../registry';
import { useRecorderStore } from '../../store/recorder';
import { RecordingsLibrary } from '../../components/ScreenRecorder/RecordingsLibrary';
import { RecordingStatusIndicator } from '../../components/ScreenRecorder/RecordingStatusIndicator';

// ── Recording helpers ──────────────────────────────────────────────────

async function beginRecording(mode: 'tab' | 'window') {
  const store = useRecorderStore.getState();
  if (store.isRecording) return; // Already recording

  try {
    // Use getDisplayMedia — works because main.ts sets up
    // setDisplayMediaRequestHandler to auto-grant via desktopCapturer
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    // Find a supported mimeType
    const mimeType = [
      'video/webm; codecs=vp9',
      'video/webm; codecs=vp8',
      'video/webm',
    ].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

    let finalStream = displayStream;
    let micStream: MediaStream | null = null;

    // ── Mic mixing ──
    if (store.micEnabled) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        store.setMicStream(micStream);

        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        // Mix mic audio
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);

        // If display stream has audio tracks, mix those too
        if (displayStream.getAudioTracks().length > 0) {
          const displayAudio = audioContext.createMediaStreamSource(
            new MediaStream(displayStream.getAudioTracks())
          );
          displayAudio.connect(destination);
        }

        // Combine video from display + mixed audio
        finalStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
      } catch {
        // If mic access fails, continue without mic
        console.warn('[ScreenRecorder] Mic access denied, recording without mic');
      }
    }

    const recorder = new MediaRecorder(finalStream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        useRecorderStore.getState().addChunk(e.data);
      }
    };

    recorder.onstop = () => {
      displayStream.getTracks().forEach((t) => t.stop());
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
      }
    };

    // If the user stops sharing via the browser's native "Stop sharing" button
    displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
      const s = useRecorderStore.getState();
      if (s.isRecording) {
        // Trigger save through the enhanced stop
        const currentChunks = [...s.chunks];
        const currentDuration = s.duration;
        s.stopRecording();

        if (currentChunks.length > 0) {
          saveRecordingToProfile(currentChunks, mimeType, currentDuration);
        }
      }
    });

    store.startRecording(mode);
    store.setMediaRecorder(recorder);
    recorder.start(500); // collect chunks every 500ms
  } catch {
    // User cancelled the screen picker dialog or permission denied
  }
}

async function saveRecordingToProfile(chunks: Blob[], mimeType: string, duration: number) {
  if (chunks.length === 0) return;
  const blob = new Blob(chunks, { type: mimeType });
  const store = useRecorderStore.getState();

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const result = await (window as any).osBrowser?.recordings?.save(base64, {
      duration,
      mimeType,
      quality: store.quality,
      hasMic: store.micEnabled,
    });

    if (result?.success && result.recording) {
      store.setLastSavedRecording(result.recording);
      store.setShowPostRecordingToast(true);
      store.loadRecordings();
    }
  } catch {
    // Fallback to download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }
}

function stopAndSave() {
  const store = useRecorderStore.getState();
  if (!store.isRecording) return;
  const currentChunks = [...store.chunks];
  const currentDuration = store.duration;
  const currentMimeType = 'video/webm';
  store.stopRecording();
  if (currentChunks.length > 0) {
    saveRecordingToProfile(currentChunks, currentMimeType, currentDuration);
  }
}

function takeAnnotatedScreenshot() {
  const store = useRecorderStore.getState();
  if (!store.isAnnotating) {
    store.toggleAnnotation();
    // Don't start MediaRecorder — this is screenshot-only annotation mode
  }
}

function openRecordingsLibrary() {
  useRecorderStore.getState().setShowLibrary(true);
}

// ── Feature definition ─────────────────────────────────────────────────

const screenRecorderFeature = {
  id: 'screen-recorder',
  name: 'Screen Recorder',
  description: 'Record your screen, annotate, and save recordings or annotated screenshots.',
  stripColor: '#EF4444',
  icon: Video,
  category: 'productivity' as const,
  defaultEnabled: true,
  surfaces: {
    toolbar: {
      icon: Video,
      label: 'Record',
      order: 2,
      onClick: () => beginRecording('tab'),
      getIsActive: () => useRecorderStore.getState().isRecording,
      dropdownItems: [
        {
          id: 'screen-recorder:tab',
          label: 'Record Tab',
          onClick: () => beginRecording('tab'),
        },
        {
          id: 'screen-recorder:window',
          label: 'Record Window',
          onClick: () => beginRecording('window'),
        },
        {
          id: 'screen-recorder:annotate',
          label: 'Take Annotated Screenshot',
          onClick: () => takeAnnotatedScreenshot(),
        },
        {
          id: 'screen-recorder:library',
          label: 'View Recordings',
          onClick: () => openRecordingsLibrary(),
        },
      ],
    },
    sidebar: {
      panelComponent: RecordingsLibrary,
      order: 8,
      getBadgeCount: () => useRecorderStore.getState().savedRecordings.length,
      defaultPanelWidth: 340,
    },
    statusBar: {
      component: RecordingStatusIndicator,
      position: 'right' as const,
      order: 1,
    },
    commandBar: [
      {
        id: 'screen-recorder:record-tab',
        label: 'Record Tab',
        description: 'Start recording the current tab',
        keywords: ['record', 'screen', 'tab', 'video', 'capture'],
        action: () => beginRecording('tab'),
      },
      {
        id: 'screen-recorder:record-window',
        label: 'Record Window',
        description: 'Start recording the browser window',
        keywords: ['record', 'screen', 'window', 'video', 'capture'],
        action: () => beginRecording('window'),
      },
      {
        id: 'screen-recorder:stop',
        label: 'Stop Recording',
        description: 'Stop and save the current recording',
        keywords: ['stop', 'recording', 'save'],
        action: () => stopAndSave(),
      },
      {
        id: 'screen-recorder:annotate',
        label: 'Take Annotated Screenshot',
        description: 'Open annotation overlay for screenshots',
        keywords: ['annotate', 'screenshot', 'draw', 'markup', 'pen'],
        action: () => takeAnnotatedScreenshot(),
      },
      {
        id: 'screen-recorder:library',
        label: 'View Recordings Library',
        description: 'Open the recordings library panel',
        keywords: ['recordings', 'library', 'videos', 'saved'],
        action: () => openRecordingsLibrary(),
      },
    ],
  },
};

FeatureRegistry.register(screenRecorderFeature);
export default screenRecorderFeature;
