import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Plus, Trash2, BarChart2, SendHorizontal } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';

interface PollCreatorPanelProps {
  onClose: () => void;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

export function PollCreatorPanel({ onClose }: PollCreatorPanelProps) {
  const activeRoomId = useGovChatStore(s => s.activeRoomId);
  const sendPoll = useGovChatStore(s => s.sendPoll);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isSending, setIsSending] = useState(false);

  const questionRef = useRef<HTMLInputElement>(null);

  // Auto-focus question on mount
  useEffect(() => {
    requestAnimationFrame(() => questionRef.current?.focus());
  }, []);

  const canSend =
    question.trim().length > 0 &&
    options.filter(o => o.trim().length > 0).length >= MIN_OPTIONS;

  const handleAddOption = useCallback(() => {
    if (options.length < MAX_OPTIONS) {
      setOptions(prev => [...prev, '']);
    }
  }, [options.length]);

  const handleRemoveOption = useCallback(
    (idx: number) => {
      if (options.length <= MIN_OPTIONS) return;
      setOptions(prev => prev.filter((_, i) => i !== idx));
    },
    [options.length],
  );

  const handleOptionChange = useCallback((idx: number, value: string) => {
    setOptions(prev => prev.map((o, i) => (i === idx ? value : o)));
  }, []);

  const handleSend = useCallback(() => {
    if (!activeRoomId || !canSend || isSending) return;
    setIsSending(true);

    const trimmedOptions = options
      .map(o => o.trim())
      .filter(o => o.length > 0);

    sendPoll(activeRoomId, question.trim(), trimmedOptions);
    onClose();
  }, [activeRoomId, canSend, isSending, question, options, sendPoll, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      className="shrink-0"
      style={{
        borderTop: '1px solid var(--color-border-1)',
        background: 'var(--color-surface-1)',
        animation: 'pollSlideUp 0.2s ease-out',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Inline animation style */}
      <style>{`
        @keyframes pollSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: '1px solid var(--color-border-1)',
        }}
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={15} style={{ color: '#D4A017' }} />
          <span
            className="text-[11.5px] font-semibold"
            style={{ color: '#D4A017' }}
          >
            Create Poll
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-opacity hover:opacity-70"
          aria-label="Close poll creator"
        >
          <X size={14} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-2.5">
        {/* Question */}
        <div>
          <label
            className="text-[10px] font-medium uppercase tracking-wide mb-1 block"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Question
          </label>
          <input
            ref={questionRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            maxLength={200}
            className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none transition-colors"
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-1)',
              fontFamily: 'inherit',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#D4A017';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-1)';
            }}
          />
        </div>

        {/* Options */}
        <div>
          <label
            className="text-[10px] font-medium uppercase tracking-wide mb-1 block"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Options
          </label>
          <div className="flex flex-col gap-1.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    background: 'rgba(212, 160, 23, 0.12)',
                    color: '#D4A017',
                  }}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={e => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={100}
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-[11.5px] outline-none transition-colors"
                  style={{
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-1)',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#D4A017';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border-1)';
                  }}
                />
                {options.length > MIN_OPTIONS && (
                  <button
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1 rounded transition-opacity hover:opacity-70"
                    aria-label={`Remove option ${idx + 1}`}
                  >
                    <Trash2
                      size={12}
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < MAX_OPTIONS && (
            <button
              onClick={handleAddOption}
              className="flex items-center gap-1 mt-1.5 text-[10.5px] font-medium transition-opacity hover:opacity-80"
              style={{ color: '#D4A017' }}
            >
              <Plus size={12} />
              Add option
            </button>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend || isSending}
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-semibold transition-all duration-150"
          style={{
            background: canSend ? '#006B3F' : 'var(--color-surface-2)',
            color: canSend ? '#ffffff' : 'var(--color-text-muted)',
            cursor: canSend ? 'pointer' : 'default',
            opacity: isSending ? 0.6 : 1,
          }}
        >
          <SendHorizontal size={13} />
          Send Poll
        </button>
      </div>
    </div>
  );
}
