import React, { useState, useRef, useEffect } from 'react';
import {
  X, Globe, ArrowLeftRight, Copy, Check, ChevronDown, ChevronUp,
  Clock, Trash2, Loader2, Info, BookOpen,
} from 'lucide-react';
import {
  useTranslationStore,
  SUPPORTED_LANGUAGES,
  LANGUAGE_COLORS,
  getDictionaryCount,
} from '../../store/translation';

// ── Language Selector Dropdown ────────────────────────────────────────
function LanguageDropdown({
  value,
  onChange,
  exclude,
}: {
  value: string;
  onChange: (lang: string) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const langs = Object.entries(SUPPORTED_LANGUAGES).filter(([code]) => code !== exclude);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '7px 10px',
          borderRadius: 10,
          border: '1px solid var(--color-border-1)',
          background: 'var(--color-surface-2)',
          color: 'var(--color-text-primary)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: LANGUAGE_COLORS[value] || '#888',
              flexShrink: 0,
            }}
          />
          {SUPPORTED_LANGUAGES[value] || value}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            borderRadius: 10,
            border: '1px solid var(--color-border-1)',
            background: 'var(--color-surface-1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {langs.map(([code, name]) => (
            <button
              key={code}
              onClick={() => {
                onChange(code);
                setOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                border: 'none',
                background: code === value ? 'var(--color-surface-2)' : 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'var(--color-surface-2)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background =
                  code === value ? 'var(--color-surface-2)' : 'transparent';
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: LANGUAGE_COLORS[code] || '#888',
                  flexShrink: 0,
                }}
              />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────
export function TranslationPanel({ onClose }: { onClose: () => void }) {
  const {
    sourceLanguage,
    targetLanguage,
    inputText,
    translatedText,
    isTranslating,
    history,
    setSourceLanguage,
    setTargetLanguage,
    setInputText,
    translate,
    swapLanguages,
    clearHistory,
    reTranslate,
  } = useTranslationStore();

  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDictInfo, setShowDictInfo] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [inputText]);

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      translate();
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const truncate = (str: string, len: number) =>
    str.length > len ? str.slice(0, len) + '...' : str;

  // Gather all non-English languages for dictionary info
  const ghanaianLangs = Object.entries(SUPPORTED_LANGUAGES).filter(([c]) => c !== 'en');

  return (
    <div
      className="animate-slide-in-right"
      style={{
        width: 340,
        borderLeft: '1px solid var(--color-border-1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-surface-1)',
        flexShrink: 0,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={16} style={{ color: 'var(--color-accent)' }} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            Translation
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 999,
              fontWeight: 600,
              background: '#006B3F',
              color: '#fff',
            }}
          >
            6 Languages
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Language Selector Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 16px',
          }}
        >
          <LanguageDropdown
            value={sourceLanguage}
            onChange={setSourceLanguage}
            exclude={targetLanguage}
          />
          <button
            onClick={swapLanguages}
            title="Swap languages"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid var(--color-border-1)',
              background: 'var(--color-surface-2)',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
            }}
          >
            <ArrowLeftRight size={14} />
          </button>
          <LanguageDropdown
            value={targetLanguage}
            onChange={setTargetLanguage}
            exclude={sourceLanguage}
          />
        </div>

        {/* Input Textarea */}
        <div style={{ padding: '0 16px' }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste text..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid var(--color-border-1)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-primary)',
              fontSize: 13,
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-1)';
            }}
          />
        </div>

        {/* Translate Button */}
        <div style={{ padding: '10px 16px 0' }}>
          <button
            onClick={translate}
            disabled={!inputText.trim() || isTranslating}
            style={{
              width: '100%',
              padding: '9px 0',
              borderRadius: 10,
              border: 'none',
              background:
                !inputText.trim() || isTranslating
                  ? 'var(--color-surface-2)'
                  : 'var(--color-accent)',
              color:
                !inputText.trim() || isTranslating
                  ? 'var(--color-text-muted)'
                  : '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: !inputText.trim() || isTranslating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            {isTranslating ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Translating...
              </>
            ) : (
              <>
                <Globe size={14} />
                Translate
              </>
            )}
          </button>
        </div>

        {/* Output Area */}
        {translatedText && (
          <div style={{ padding: '12px 16px 0' }}>
            <div
              style={{
                position: 'relative',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-border-1)',
                background: 'var(--color-surface-2)',
                minHeight: 48,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: LANGUAGE_COLORS[targetLanguage] || 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {SUPPORTED_LANGUAGES[targetLanguage]}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copy translation"
                  style={{
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: copied ? '#006B3F' : 'var(--color-text-muted)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      'var(--color-surface-1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: translatedText.startsWith('[Offline]')
                    ? 'var(--color-text-muted)'
                    : 'var(--color-text-primary)',
                  fontWeight: translatedText.startsWith('[Offline]') ? 400 : 500,
                  margin: 0,
                  wordBreak: 'break-word',
                }}
              >
                {translatedText.startsWith('[Offline]') ? (
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <Info
                      size={14}
                      style={{
                        color: '#D4A017',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    />
                    <span style={{ fontSize: 12, lineHeight: 1.5 }}>
                      Full translation requires internet connection. Showing closest
                      match or try <strong>AskOzzy</strong> for AI translation.
                    </span>
                  </span>
                ) : (
                  translatedText
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── History Section ─────────────────────────────────────── */}
        <div style={{ padding: '14px 16px 0' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
              History
              {history.length > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-muted)',
                    fontWeight: 500,
                  }}
                >
                  {history.length}
                </span>
              )}
            </span>
            {showHistory ? (
              <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} />
            ) : (
              <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </button>

          {showHistory && (
            <div>
              {history.length === 0 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    padding: '12px 0',
                  }}
                >
                  No translations yet
                </p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginBottom: 6,
                    }}
                  >
                    <button
                      onClick={clearHistory}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: '#CE1126',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: 4,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          'rgba(206,17,38,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={11} />
                      Clear
                    </button>
                  </div>
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => reTranslate(entry)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        marginBottom: 4,
                        borderRadius: 10,
                        border: '1px solid var(--color-border-1)',
                        background: 'var(--color-surface-2)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          'var(--color-accent)';
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          '0 2px 8px rgba(0,0,0,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          'var(--color-border-1)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'var(--color-text-primary)',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {truncate(entry.source, 30)}
                        </p>
                        {entry.target && (
                          <p
                            style={{
                              fontSize: 11,
                              color: LANGUAGE_COLORS[entry.targetLang] || 'var(--color-text-muted)',
                              margin: '2px 0 0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {truncate(entry.target, 30)}
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 999,
                            background: LANGUAGE_COLORS[entry.targetLang] || '#888',
                            color: '#fff',
                            textTransform: 'uppercase',
                          }}
                        >
                          {entry.targetLang}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Offline Dictionary Info ─────────────────────────────── */}
        <div style={{ padding: '10px 16px 16px' }}>
          <button
            onClick={() => setShowDictInfo(!showDictInfo)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <BookOpen size={13} style={{ color: 'var(--color-text-muted)' }} />
              Offline Dictionary
            </span>
            {showDictInfo ? (
              <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} />
            ) : (
              <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </button>

          {showDictInfo && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                marginTop: 4,
              }}
            >
              {ghanaianLangs.map(([code, name]) => {
                const count = getDictionaryCount(code);
                return (
                  <div
                    key={code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--color-border-1)',
                      background: 'var(--color-surface-2)',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: LANGUAGE_COLORS[code] || '#888',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          margin: 0,
                        }}
                      >
                        {name}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: 'var(--color-text-muted)',
                          margin: 0,
                        }}
                      >
                        {count} phrases
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--color-border-1)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Offline dictionaries for Twi, Ga, Ewe, Dagbani, Hausa &amp; Fante
        </p>
      </div>

      {/* Spinner keyframe (injected once) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
