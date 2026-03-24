import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, PenTool, GripHorizontal, Mic, MicOff, ChevronDown, FolderOpen } from 'lucide-react';
import { useRecorderStore, RecordingQuality } from '../../store/recorder';

const MAX_DURATION_SECONDS = 30 * 60; // 30 minutes
const WARNING_SECONDS = 25 * 60; // 25 minutes

/** Format seconds as MM:SS or HH:MM:SS */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  if (h > 0) return `${h}:${m}:${s}`;
  return `${m}:${s}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const RecorderControls: React.FC = () => {
  const {
    isRecording,
    isPaused,
    duration,
    isAnnotating,
    chunks,
    micEnabled,
    quality,
    tick,
    pauseRecording,
    resumeRecording,
    stopRecording,
    toggleAnnotation,
    setShowPostRecordingToast,
    setLastSavedRecording,
    loadRecordings,
  } = useRecorderStore();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [warningShown, setWarningShown] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // ── Timer tick ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => tick(), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused, tick]);

  // ── Auto-stop at 30 min, warn at 25 min ─────────────────────────
  useEffect(() => {
    if (!isRecording) {
      setWarningShown(false);
      setShowWarning(false);
      return;
    }
    if (duration >= MAX_DURATION_SECONDS) {
      handleStop();
    } else if (duration >= WARNING_SECONDS && !warningShown) {
      setWarningShown(true);
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    }
  }, [duration, isRecording]);

  // ── Drag support ───────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    draggingRef.current = true;
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !dragRef.current) return;
      const x = ev.clientX - offsetRef.current.x;
      const y = ev.clientY - offsetRef.current.y;
      dragRef.current.style.left = `${x}px`;
      dragRef.current.style.top = `${y}px`;
      dragRef.current.style.bottom = 'auto';
      dragRef.current.style.transform = 'none';
    };

    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Stop & save to profile directory ─────────────────────────────
  const handleStop = async () => {
    const currentChunks = [...chunks];
    const currentDuration = duration;
    const currentQuality = quality;
    const currentMicEnabled = micEnabled;
    stopRecording();

    if (currentChunks.length === 0) return;

    const blob = new Blob(currentChunks, { type: 'video/webm' });

    try {
      // Convert to base64 for IPC transport
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const result = await (window as any).osBrowser?.recordings?.save(base64, {
        duration: currentDuration,
        mimeType: 'video/webm',
        quality: currentQuality,
        hasMic: currentMicEnabled,
      });

      if (result?.success && result.recording) {
        setLastSavedRecording(result.recording);
        setShowPostRecordingToast(true);
        loadRecordings();
      }
    } catch (err) {
      console.error('[Recorder] Failed to save recording:', err);
      // Fallback: download as file
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
  };

  if (!isRecording) return null;

  return (
    <>
      <div
        ref={dragRef}
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(15, 15, 20, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: 9999,
          padding: '8px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14,
          userSelect: 'none',
        }}
      >
        {/* Drag handle */}
        <button
          onMouseDown={handleMouseDown}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'grab',
            padding: 2,
            display: 'flex',
          }}
          title="Drag to move"
        >
          <GripHorizontal size={16} />
        </button>

        {/* Pulsing red dot */}
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#EF4444',
            display: 'inline-block',
            animation: isPaused ? 'none' : 'pulse-recording 1.2s ease-in-out infinite',
          }}
        />

        {/* Timer */}
        <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 48, fontFamily: 'monospace' }}>
          {formatTime(duration)}
        </span>

        {/* Mic indicator */}
        <span style={{ color: micEnabled ? '#22C55E' : 'rgba(255,255,255,0.3)', display: 'flex' }} title={micEnabled ? 'Mic on' : 'Mic off'}>
          {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
        </span>

        {/* Pause / Resume */}
        <button
          onClick={isPaused ? resumeRecording : pauseRecording}
          style={btnStyle}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>

        {/* Stop */}
        <button onClick={handleStop} style={{ ...btnStyle, color: '#EF4444' }} title="Stop & Save">
          <Square size={16} fill="#EF4444" />
        </button>

        {/* Annotation toggle */}
        <button
          onClick={toggleAnnotation}
          style={{
            ...btnStyle,
            background: isAnnotating ? 'rgba(239,68,68,0.25)' : undefined,
            color: isAnnotating ? '#EF4444' : '#fff',
          }}
          title="Toggle annotation"
        >
          <PenTool size={16} />
        </button>

        {/* Keyframe animation */}
        <style>{`
          @keyframes pulse-recording {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}</style>
      </div>

      {/* 25-min warning toast */}
      {showWarning && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: '#F59E0B',
          color: '#1a1a1a',
          padding: '10px 20px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          Recording will auto-stop in 5 minutes
        </div>
      )}
    </>
  );
};

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  borderRadius: 9999,
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  cursor: 'pointer',
  transition: 'background 150ms',
};

export default RecorderControls;
