import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Check, Mic } from 'lucide-react';

interface VoiceNoteRecorderProps {
  onSend: (blob: Blob, duration: number, waveform: number[]) => void;
  onCancel: () => void;
}

const MAX_DURATION = 120; // seconds
const WAVEFORM_SAMPLES = 40;

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(() => Array(WAVEFORM_SAMPLES).fill(0));
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const waveformHistoryRef = useRef<number[]>([]);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    startRecording();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      waveformHistoryRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100); // collect data every 100ms
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setElapsed(0);

      // Timer
      timerRef.current = setInterval(() => {
        const sec = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(sec);
        if (sec >= MAX_DURATION) {
          handleSend();
        }
      }, 100);

      // Waveform animation
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Compute RMS amplitude 0-1
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const amplitude = Math.min(1, rms * 3); // amplify for visual effect

        waveformHistoryRef.current.push(amplitude);
        if (waveformHistoryRef.current.length > WAVEFORM_SAMPLES) {
          waveformHistoryRef.current = waveformHistoryRef.current.slice(-WAVEFORM_SAMPLES);
        }

        // Pad with zeros if not enough samples yet
        const padded = [
          ...Array(Math.max(0, WAVEFORM_SAMPLES - waveformHistoryRef.current.length)).fill(0),
          ...waveformHistoryRef.current,
        ];
        setWaveform(padded);

        rafRef.current = requestAnimationFrame(updateWaveform);
      };
      rafRef.current = requestAnimationFrame(updateWaveform);
    } catch {
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const handleSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const duration = (Date.now() - startTimeRef.current) / 1000;

      // Downsample waveform history to WAVEFORM_SAMPLES
      const history = waveformHistoryRef.current;
      const finalWaveform: number[] = [];
      const step = Math.max(1, Math.floor(history.length / WAVEFORM_SAMPLES));
      for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
        const idx = Math.min(i * step, history.length - 1);
        finalWaveform.push(history[idx] ?? 0);
      }

      cleanup();
      onSend(blob, duration, finalWaveform);
    };

    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    recorder.stop();
    setIsRecording(false);
  }, [cleanup, onSend]);

  const handleCancel = useCallback(() => {
    cleanup();
    setIsRecording(false);
    onCancel();
  }, [cleanup, onCancel]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
      >
        <Mic className="h-5 w-5 text-red-500" />
        <span className="flex-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {error}
        </span>
        <button
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-red-500/20"
        >
          <X className="h-5 w-5 text-red-500" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
    >
      {/* Recording indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {isRecording ? 'Recording...' : 'Starting...'}
        </span>
      </div>

      {/* Waveform visualization */}
      <div className="flex flex-1 items-center justify-center gap-[2px]" style={{ height: 36 }}>
        {waveform.map((amp, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: 3,
              height: Math.max(3, amp * 32),
              backgroundColor: '#CE1126',
              opacity: 0.5 + amp * 0.5,
            }}
          />
        ))}
      </div>

      {/* Elapsed time */}
      <span
        className="min-w-[48px] text-center font-mono text-sm tabular-nums"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {formatTime(elapsed)}
      </span>

      {/* Cancel */}
      <button
        onClick={handleCancel}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-red-500/20"
        title="Cancel recording"
      >
        <X className="h-5 w-5 text-red-500" />
      </button>

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={!isRecording || elapsed < 0.5}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:brightness-110 disabled:opacity-40"
        style={{ backgroundColor: '#006B3F' }}
        title="Send voice note"
      >
        <Check className="h-5 w-5 text-white" />
      </button>
    </div>
  );
};

export default VoiceNoteRecorder;
