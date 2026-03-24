import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Banknote,
  BarChart2,
  ChevronDown,
  Lock,
  Mic,
  Paperclip,
  SendHorizontal,
  Smile,
  Square,
  Trophy,
  X,
} from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import { MatrixClientService } from '@/services/MatrixClientService';
import type { ClassificationLevel, ReplyTo } from '@/types/govchat';
import { CLASSIFICATION_COLORS } from '@/types/govchat';
import { FootballPanel } from './FootballPanel';
import type { FootballMatch } from './FootballScoreCard';
import { PollCreatorPanel } from './PollCreatorPanel';
import { MoMoPanel } from './MoMoPanel';
import { StickerPicker } from './stickers/StickerPicker';

/* ─────────── constants ─────────── */

const CLASSIFICATION_LEVELS: ClassificationLevel[] = [
  'UNCLASSIFIED',
  'OFFICIAL',
  'SENSITIVE',
  'SECRET',
];

const MAX_TEXTAREA_LINES = 5;
const LINE_HEIGHT_PX = 22;
const MIN_HEIGHT = LINE_HEIGHT_PX;
const MAX_HEIGHT = LINE_HEIGHT_PX * MAX_TEXTAREA_LINES;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ─────────── component ─────────── */

export function MessageInput() {
  const activeRoomId = useGovChatStore(s => s.activeRoomId);
  const rooms = useGovChatStore(s => s.rooms);
  const currentUser = useGovChatStore(s => s.currentUser);
  const replyingTo = useGovChatStore(s => s.replyingTo);
  const connectionStatus = useGovChatStore(s => s.connectionStatus);
  const sendMessage = useGovChatStore(s => s.sendMessage);
  const sendFileMessage = useGovChatStore(s => s.sendFileMessage);
  const sendVoiceNote = useGovChatStore(s => s.sendVoiceNote);
  const sendFootballScore = useGovChatStore(s => s.sendFootballScore);
  const sendSticker = useGovChatStore(s => s.sendSticker);
  const setReplyingTo = useGovChatStore(s => s.setReplyingTo);

  const activeRoom = useMemo(
    () => rooms.find(r => r.roomId === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  /* ── local state ── */
  const [inputText, setInputText] = useState('');
  const [selectedClassification, setSelectedClassification] =
    useState<ClassificationLevel | null>(null);
  const [showClassificationDropdown, setShowClassificationDropdown] =
    useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showFootballPanel, setShowFootballPanel] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showMoMoPanel, setShowMoMoPanel] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  /* ── refs ── */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);
  const classificationDropdownRef = useRef<HTMLDivElement>(null);

  /* ── derived ── */
  const effectiveClassification: ClassificationLevel =
    selectedClassification ?? activeRoom?.classification ?? 'OFFICIAL';

  const isDisabled = !activeRoomId || !currentUser;
  const canSend = inputText.trim().length > 0 || selectedFile !== null;

  /* ── sync classification with room changes ── */
  useEffect(() => {
    setSelectedClassification(null);
  }, [activeRoomId]);

  /* ── close classification dropdown on outside click ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        classificationDropdownRef.current &&
        !classificationDropdownRef.current.contains(e.target as Node)
      ) {
        setShowClassificationDropdown(false);
      }
    }
    if (showClassificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showClassificationDropdown]);

  /* ── cleanup MediaRecorder on unmount ── */
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /* ── auto-resize textarea ── */
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${MIN_HEIGHT}px`;
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(scrollH, MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [inputText, resizeTextarea]);

  /* ── typing indicator debounce ── */
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── @mention detection ── */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInputText(value);

      // Send typing indicator (debounced)
      if (activeRoomId && value.length > 0) {
        if (!typingTimeoutRef.current) {
          MatrixClientService.sendTyping(activeRoomId, true).catch(() => {});
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          if (activeRoomId) MatrixClientService.sendTyping(activeRoomId, false).catch(() => {});
          typingTimeoutRef.current = null;
        }, 4000);
      }

      // Detect @mention
      const cursorPos = e.target.selectionStart ?? value.length;
      const textBeforeCursor = value.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setShowMentions(true);
        setMentionQuery(mentionMatch[1].toLowerCase());
      } else {
        setShowMentions(false);
        setMentionQuery('');
      }
    },
    [activeRoomId],
  );

  /* ── mention autocomplete list ── */
  const mentionCandidates = useMemo(() => {
    if (!activeRoom || !showMentions) return [];
    return activeRoom.members
      .filter(m => m.userId !== currentUser?.userId)
      .filter(m =>
        mentionQuery === ''
          ? true
          : m.displayName.toLowerCase().includes(mentionQuery),
      )
      .slice(0, 6);
  }, [activeRoom, showMentions, mentionQuery, currentUser?.userId]);

  const insertMention = useCallback(
    (displayName: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const cursorPos = el.selectionStart ?? inputText.length;
      const textBeforeCursor = inputText.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      if (mentionMatch) {
        const startIdx = cursorPos - mentionMatch[0].length;
        const before = inputText.slice(0, startIdx);
        const after = inputText.slice(cursorPos);
        const newText = `${before}@${displayName} ${after}`;
        setInputText(newText);
      }
      setShowMentions(false);
      setMentionQuery('');
      el.focus();
    },
    [inputText],
  );

  /* ── send handler ── */
  const handleSend = useCallback(() => {
    if (!activeRoomId) return;

    if (selectedFile) {
      sendFileMessage(activeRoomId, selectedFile, effectiveClassification);
      setSelectedFile(null);
      // Also send text if any
      if (inputText.trim()) {
        sendMessage(activeRoomId, inputText.trim(), effectiveClassification);
      }
    } else if (inputText.trim()) {
      sendMessage(activeRoomId, inputText.trim(), effectiveClassification);
    }

    setInputText('');
    setShowMentions(false);
    setMentionQuery('');

    // Reset textarea height
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      }
    });
  }, [
    activeRoomId,
    inputText,
    selectedFile,
    effectiveClassification,
    sendMessage,
    sendFileMessage,
  ]);

  /* ── keyboard handler ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (showMentions && mentionCandidates.length > 0) {
          insertMention(mentionCandidates[0].displayName);
          return;
        }
        if (canSend) {
          handleSend();
        }
      }
    },
    [canSend, handleSend, showMentions, mentionCandidates, insertMention],
  );

  /* ── file handling ── */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          alert('File too large. Maximum size is 50 MB.');
          return;
        }
        setSelectedFile(file);
      }
      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [],
  );

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  /* ── voice recording ── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis for waveform
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      waveformSamplesRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100); // collect in 100ms chunks
      setIsRecording(true);
      setRecordingDuration(0);

      // Duration timer
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - startTime) / 1000);

        // Sample waveform
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg =
            dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length / 255;
          waveformSamplesRef.current.push(Math.min(1, avg * 2));
        }
      }, 100);
    } catch (err) {
      console.warn('[MessageInput] Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(
    (shouldSend: boolean) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') return;

      // Stop the duration timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      recorder.onstop = () => {
        if (shouldSend && activeRoomId) {
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType,
          });
          const duration = recordingDuration;
          // Downsample waveform to ~50 points
          const raw = waveformSamplesRef.current;
          const targetLen = 50;
          const waveform: number[] = [];
          if (raw.length <= targetLen) {
            waveform.push(...raw);
          } else {
            const step = raw.length / targetLen;
            for (let i = 0; i < targetLen; i++) {
              const idx = Math.floor(i * step);
              waveform.push(raw[idx] ?? 0);
            }
          }

          // Convert blob to data URL for reliable playback in Electron
          // Blob URLs fail in sandboxed Electron renderers
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            sendVoiceNote(activeRoomId, blob, duration, waveform, dataUrl);
          };
          reader.readAsDataURL(blob);
        }

        // Clean up stream tracks
        recorder.stream.getTracks().forEach(t => t.stop());
        audioChunksRef.current = [];
        waveformSamplesRef.current = [];
      };

      recorder.stop();
      setIsRecording(false);
      setRecordingDuration(0);

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    },
    [activeRoomId, recordingDuration, sendVoiceNote],
  );

  const handleShareFootballMatch = useCallback(
    (match: FootballMatch) => {
      if (!activeRoomId) return;
      sendFootballScore(activeRoomId, match as unknown as Record<string, unknown>);
      setShowFootballPanel(false);
    },
    [activeRoomId, sendFootballScore],
  );

  const handleSendSticker = useCallback(
    (packId: string, stickerId: string, altText: string) => {
      if (!activeRoomId) return;
      sendSticker(activeRoomId, packId, stickerId, altText);
      setShowStickerPicker(false);
    },
    [activeRoomId, sendSticker],
  );

  const handleEmojiClick = useCallback(() => {
    setShowStickerPicker(prev => !prev);
  }, []);

  /* ─────────── render ─────────── */

  if (!activeRoomId) return null;

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        borderTop: '1px solid var(--color-border-1)',
        background: 'var(--color-surface-1)',
      }}
    >
      {/* ── Reply bar ── */}
      {replyingTo && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            borderLeft: '3px solid #D4A017',
            background: 'rgba(212, 160, 23, 0.06)',
          }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-[10.5px] font-semibold truncate"
              style={{ color: '#D4A017' }}
            >
              Replying to {replyingTo.senderName}
            </p>
            <p
              className="text-[10.5px] truncate"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {replyingTo.body}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded hover:opacity-80 transition-opacity shrink-0"
            aria-label="Cancel reply"
          >
            <X size={13} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>
      )}

      {/* ── Classification selector ── */}
      <div
        className="relative px-3 py-1"
        style={{ borderBottom: '1px solid var(--color-border-1)' }}
        ref={classificationDropdownRef}
      >
        <button
          onClick={() => setShowClassificationDropdown(prev => !prev)}
          disabled={isDisabled}
          className="flex items-center gap-1.5 text-[10px] font-semibold rounded px-2 py-1 transition-colors hover:opacity-80"
          style={{
            background: `${CLASSIFICATION_COLORS[effectiveClassification]}14`,
            color: CLASSIFICATION_COLORS[effectiveClassification],
          }}
        >
          <span
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={{
              background: CLASSIFICATION_COLORS[effectiveClassification],
            }}
          />
          Classification: {effectiveClassification}
          <ChevronDown size={11} />
        </button>

        {/* Dropdown */}
        {showClassificationDropdown && (
          <div
            className="absolute left-3 bottom-full mb-1 rounded-lg overflow-hidden shadow-lg z-50"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
              minWidth: 180,
            }}
          >
            {CLASSIFICATION_LEVELS.map(level => (
              <button
                key={level}
                onClick={() => {
                  setSelectedClassification(level);
                  setShowClassificationDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors hover:opacity-80"
                style={{
                  color:
                    level === effectiveClassification
                      ? CLASSIFICATION_COLORS[level]
                      : 'var(--color-text-primary)',
                  background:
                    level === effectiveClassification
                      ? `${CLASSIFICATION_COLORS[level]}10`
                      : 'transparent',
                }}
              >
                <span
                  className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{ background: CLASSIFICATION_COLORS[level] }}
                />
                {level}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── File preview bar ── */}
      {selectedFile && !isRecording && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background: 'rgba(0, 107, 63, 0.05)',
            borderBottom: '1px solid var(--color-border-1)',
          }}
        >
          <Paperclip
            size={13}
            style={{ color: '#006B3F' }}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-medium truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {selectedFile.name}
            </p>
            <p
              className="text-[9.5px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={clearSelectedFile}
            className="p-1 rounded hover:opacity-80 transition-opacity shrink-0"
            aria-label="Remove file"
          >
            <X size={13} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>
      )}

      {/* ── Poll creator panel ── */}
      {showPollCreator && (
        <PollCreatorPanel onClose={() => setShowPollCreator(false)} />
      )}

      {/* ── Football panel (slide-up) ── */}
      {showFootballPanel && (
        <div className="relative">
          <FootballPanel
            onClose={() => setShowFootballPanel(false)}
            onShareMatch={handleShareFootballMatch}
          />
        </div>
      )}

      {/* ── MoMo panel ── */}
      {showMoMoPanel && (
        <div className="relative">
          <MoMoPanel onClose={() => setShowMoMoPanel(false)} />
        </div>
      )}

      {/* ── Sticker Picker (positioned above input) ── */}
      <div className="relative">
        <StickerPicker
          isOpen={showStickerPicker}
          onClose={() => setShowStickerPicker(false)}
          onSendSticker={handleSendSticker}
        />
      </div>

      {/* ── Main input row ── */}
      <div className="flex items-end gap-1.5 px-2 py-2">
        {/* Left action buttons */}
        {!isRecording && (
          <div className="flex items-center gap-0.5 pb-0.5">
            {/* Paperclip / attach file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Attach file"
              aria-label="Attach file"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.mp3,.mp4,.wav,.ogg,.webm,.txt,.csv,.zip"
              className="hidden"
              onChange={handleFileSelect}
              tabIndex={-1}
            />

            {/* Microphone / voice note */}
            <button
              onClick={startRecording}
              disabled={isDisabled}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Record voice note"
              aria-label="Record voice note"
            >
              <Mic size={16} />
            </button>

            {/* Poll creator */}
            <button
              onClick={() => setShowPollCreator(prev => !prev)}
              disabled={isDisabled}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: showPollCreator ? '#D4A017' : 'var(--color-text-muted)' }}
              title="Create poll"
              aria-label="Create poll"
            >
              <BarChart2 size={16} />
            </button>

            {/* Football scores */}
            <button
              onClick={() => setShowFootballPanel(prev => !prev)}
              disabled={isDisabled}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: showFootballPanel ? '#D4A017' : 'var(--color-text-muted)' }}
              title="Football scores"
              aria-label="Football scores"
            >
              <Trophy size={16} />
            </button>

            {/* MoMo / mobile money */}
            <button
              onClick={() => setShowMoMoPanel(prev => !prev)}
              disabled={isDisabled}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: showMoMoPanel ? '#D4A017' : 'var(--color-text-muted)' }}
              title="MoMo in Chat"
              aria-label="MoMo mobile money"
            >
              <Banknote size={16} />
            </button>
          </div>
        )}

        {/* Recording UI replaces textarea */}
        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 px-3 py-2">
            {/* Red dot */}
            <span
              className="w-[10px] h-[10px] rounded-full shrink-0 animate-pulse"
              style={{ background: '#CE1126' }}
            />
            <span
              className="text-[12px] font-medium"
              style={{ color: '#CE1126' }}
            >
              Recording...
            </span>
            <span
              className="text-[12px] font-mono tabular-nums"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {formatDuration(recordingDuration)}
            </span>
            <div className="flex-1" />

            {/* Cancel recording */}
            <button
              onClick={() => stopRecording(false)}
              className="p-1.5 rounded-md transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-muted)' }}
              title="Cancel recording"
              aria-label="Cancel recording"
            >
              <X size={16} />
            </button>

            {/* Send recording */}
            <button
              onClick={() => stopRecording(true)}
              className="p-1.5 rounded-md transition-colors hover:opacity-80"
              style={{ color: '#006B3F' }}
              title="Send voice note"
              aria-label="Send voice note"
            >
              <Square size={16} fill="#006B3F" />
            </button>
          </div>
        ) : (
          /* Textarea */
          <div className="flex-1 relative">
            {/* @mention autocomplete */}
            {showMentions && mentionCandidates.length > 0 && (
              <div
                className="absolute left-0 bottom-full mb-1 rounded-lg overflow-hidden shadow-lg z-50"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border-1)',
                  minWidth: 200,
                  maxWidth: 280,
                }}
              >
                {mentionCandidates.map(member => (
                  <button
                    key={member.userId}
                    onClick={() => insertMention(member.displayName)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:opacity-80"
                    style={{
                      background: 'transparent',
                    }}
                    onMouseDown={e => e.preventDefault()} // prevent blur
                  >
                    {/* Avatar placeholder */}
                    <span
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                      style={{ background: '#006B3F' }}
                    >
                      {member.displayName
                        .split(' ')
                        .map(w => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-[11px] font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {member.displayName}
                      </p>
                      <p
                        className="text-[9.5px] truncate"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {member.department}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isDisabled}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none rounded-lg px-3 py-2 text-[12.5px] leading-[22px] outline-none transition-colors"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-1)',
                minHeight: MIN_HEIGHT + 16, // + padding
                maxHeight: MAX_HEIGHT + 16,
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        {/* Right action buttons */}
        {!isRecording && (
          <div className="flex items-center gap-0.5 pb-0.5">
            {/* Emoji placeholder */}
            <button
              onClick={handleEmojiClick}
              disabled={isDisabled}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Emoji"
              aria-label="Insert emoji"
            >
              <Smile size={16} />
            </button>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={isDisabled || !canSend}
              className="p-1.5 rounded-md transition-colors"
              style={{
                color: canSend && !isDisabled ? '#FFFFFF' : 'var(--color-text-muted)',
                background:
                  canSend && !isDisabled
                    ? '#006B3F'
                    : 'var(--color-surface-2)',
                borderRadius: 8,
              }}
              title="Send message"
              aria-label="Send message"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom status line (compact) ── */}
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-0">
        <Lock size={9} style={{ color: '#006B3F' }} />
        <span className="text-[9px]" style={{ color: '#006B3F' }}>Encrypted</span>
        <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>&middot;</span>
        <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: CLASSIFICATION_COLORS[effectiveClassification] }} />
        <span className="text-[9px] font-medium" style={{ color: CLASSIFICATION_COLORS[effectiveClassification] }}>{effectiveClassification}</span>
      </div>
    </div>
  );
}
