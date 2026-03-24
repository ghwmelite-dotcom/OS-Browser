import React from 'react';
import { useRecorderStore } from '../../store/recorder';
import type { StatusBarIndicatorProps } from '../../features/registry';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const RecordingStatusIndicator: React.FC<StatusBarIndicatorProps> = ({ onClick }) => {
  const { isRecording, isPaused, duration } = useRecorderStore();

  if (!isRecording) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors hover:bg-surface-2 cursor-pointer"
      title="Click to stop recording"
      style={{ border: 'none', background: 'rgba(239,68,68,0.1)' }}
    >
      {/* Pulsing red dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#EF4444',
          display: 'inline-block',
          animation: isPaused ? 'none' : 'pulse-rec-status 1.2s ease-in-out infinite',
        }}
      />
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#EF4444',
        fontFamily: 'monospace',
        letterSpacing: '0.5px',
      }}>
        REC {formatTime(duration)}
      </span>
      <style>{`
        @keyframes pulse-rec-status {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      `}</style>
    </button>
  );
};

export default RecordingStatusIndicator;
