import { h } from '../utils/dom';
import { formatTime, formatBytes, truncate } from '../utils/format';
import { mxcToHttp, matrixSendPollVote } from '../api';
import { openInAppBrowser } from './in-app-browser';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const QUICK_REACTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];

export interface MessageCallbacks {
  onReply?: (event: any) => void;
  onReaction?: (eventId: string, emoji: string) => void;
  onDelete?: (event: any) => void;
  onEdit?: (event: any) => void;
  onForward?: (event: any) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format audio duration ms -> "0:23" */
function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Sender display name from @user:server */
function displayName(sender: string): string {
  return sender?.split(':')[0].replace('@', '') || 'Unknown';
}

// ---------------------------------------------------------------------------
// Sub-builders
// ---------------------------------------------------------------------------

function buildReplyPreview(event: any, isOwnMessage: boolean): HTMLElement | null {
  const replyTo = event.content?.['m.relates_to']?.['m.in_reply_to'];
  if (!replyTo) return null;

  // Matrix puts the replied-to body in the formatted_body or we parse from body
  // The reply fallback is in the body prefixed with "> "
  let quotedSender = '';
  let quotedText = '';

  const body: string = event.content?.body || '';
  const lines = body.split('\n');
  const quoteLines: string[] = [];
  let pastQuote = false;

  for (const line of lines) {
    if (!pastQuote && line.startsWith('> ')) {
      const stripped = line.slice(2);
      // First line may be "> <@user:server> text"
      const senderMatch = stripped.match(/^<(@[^>]+)>\s*(.*)/);
      if (senderMatch && !quotedSender) {
        quotedSender = displayName(senderMatch[1]);
        if (senderMatch[2]) quoteLines.push(senderMatch[2]);
      } else {
        quoteLines.push(stripped);
      }
    } else {
      pastQuote = true;
    }
  }
  quotedText = truncate(quoteLines.join(' ').trim(), 80) || 'Original message';
  if (!quotedSender) quotedSender = 'User';

  const bgColor = isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.06)';
  const textColor = isOwnMessage ? 'rgba(255,255,255,0.85)' : '#aaa';

  return h('div', {
    className: 'reply-preview',
    style: {
      borderLeft: '3px solid #D4A017',
      borderRadius: '2px',
      padding: '4px 8px',
      marginBottom: '6px',
      background: bgColor,
      cursor: 'pointer',
    },
  },
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(10px, 2.6vw, 11px)',
        fontWeight: '600',
        color: '#D4A017',
        lineHeight: '1.3',
      },
    }, quotedSender),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(11px, 2.8vw, 12px)',
        color: textColor,
        lineHeight: '1.3',
        marginTop: '1px',
      },
    }, quotedText),
  );
}

function buildImageContent(event: any): HTMLElement {
  const mxcUrl = event.content?.url;
  const httpUrl = mxcUrl ? mxcToHttp(mxcUrl) : '';

  const container = h('div', {
    style: { marginBottom: '4px' },
  });

  if (httpUrl) {
    const img = h('img', {
      src: httpUrl,
      alt: event.content?.body || 'Image',
      loading: 'lazy',
      style: {
        maxWidth: '220px',
        maxHeight: '220px',
        borderRadius: '8px',
        display: 'block',
        cursor: 'pointer',
      },
    }) as HTMLImageElement;

    img.addEventListener('click', () => {
      const overlay = h('div', {
        style: {
          position: 'fixed',
          inset: '0',
          background: 'rgba(0,0,0,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '100',
          padding: '16px',
        },
        onClick: (e: Event) => {
          (e.currentTarget as HTMLElement).remove();
        },
      },
        h('img', {
          src: httpUrl,
          alt: event.content?.body || 'Image',
          style: {
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: '8px',
            objectFit: 'contain',
          },
        }),
      );
      document.body.appendChild(overlay);
    });

    container.appendChild(img);
  }

  if (event.content?.body && event.content.body !== event.content?.filename) {
    container.appendChild(
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3vw, 13px)',
          lineHeight: '1.4',
          marginTop: '4px',
        },
      }, event.content.body),
    );
  }

  return container;
}

function buildFileContent(event: any, isOwnMessage: boolean): HTMLElement {
  const filename = event.content?.body || 'File';
  const size = event.content?.info?.size;
  const mxcUrl = event.content?.url;
  const httpUrl = mxcUrl ? mxcToHttp(mxcUrl) : '#';

  const borderColor = isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
  const subColor = isOwnMessage ? 'rgba(255,255,255,0.6)' : '#888';

  return h('a', {
    href: httpUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      textDecoration: 'none',
      color: 'inherit',
      padding: '8px 10px',
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      background: isOwnMessage ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.04)',
      minHeight: '44px',
    },
  },
    h('div', {
      style: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        background: '#D4A017',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        flexShrink: '0',
      },
    }, '\u{1F4CE}'),
    h('div', { style: { flex: '1', minWidth: '0' } },
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontWeight: '500',
          fontSize: 'clamp(13px, 3.2vw, 14px)',
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, filename),
      size
        ? h('div', {
            style: {
              fontSize: 'clamp(10px, 2.6vw, 11px)',
              color: subColor,
              marginTop: '2px',
            },
          }, formatBytes(size))
        : document.createTextNode(''),
    ),
    h('div', {
      style: {
        fontSize: '16px',
        flexShrink: '0',
        opacity: '0.6',
      },
    }, '\u2B07\uFE0F'),
  );
}

const VOICE_SPEED_STEPS = [1, 1.5, 2, 0.5];
const VOICE_SPEED_LS_KEY = 'govchat_voice_speed';

function getStoredVoiceSpeed(): number {
  try {
    const v = localStorage.getItem(VOICE_SPEED_LS_KEY);
    if (v) {
      const n = parseFloat(v);
      if (VOICE_SPEED_STEPS.includes(n)) return n;
    }
  } catch { /* noop */ }
  return 1;
}

function buildVoiceNote(event: any, isOwnMessage: boolean): HTMLElement {
  const info = event.content?.info || {};
  const duration = info.duration || 0;
  const durationStr = fmtDuration(duration);
  const mxcUrl = event.content?.url;
  const httpUrl = mxcUrl ? mxcToHttp(mxcUrl) : '';

  // Extract waveform data if available (MSC3245)
  const waveform: number[] = event.content?.['org.matrix.msc3245.voice']?.waveform
    || info.waveform
    || [];

  // Normalise to 20 bars
  const barCount = 20;
  const bars: number[] = [];
  if (waveform.length > 0) {
    const step = waveform.length / barCount;
    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor(i * step);
      bars.push(Math.max(0.08, (waveform[idx] || 0) / 1024));
    }
  } else {
    // Fake waveform
    for (let i = 0; i < barCount; i++) {
      bars.push(0.15 + Math.random() * 0.6);
    }
  }

  const barActiveColor = isOwnMessage ? 'rgba(255,255,255,0.85)' : '#D4A017';
  const barInactiveColor = isOwnMessage ? 'rgba(255,255,255,0.3)' : 'rgba(212,160,23,0.3)';
  const subColor = isOwnMessage ? 'rgba(255,255,255,0.6)' : '#888';

  let audioEl: HTMLAudioElement | null = null;
  let isPlaying = false;
  let progressRatio = 0;
  let currentSpeed = getStoredVoiceSpeed();

  // Play button — gold circle with white icon
  const playBtn = h('div', {
    style: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#D4A017',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      color: '#fff',
      cursor: 'pointer',
      flexShrink: '0',
    },
  }, '\u25B6');

  // Waveform container — click-to-seek
  const waveformContainer = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      flex: '1',
      height: '28px',
      cursor: 'pointer',
    },
  });

  const barEls: HTMLElement[] = [];
  for (let i = 0; i < barCount; i++) {
    const barEl = h('div', {
      style: {
        flex: '1',
        height: `${Math.round(bars[i] * 100)}%`,
        minHeight: '3px',
        borderRadius: '1.5px',
        background: barInactiveColor,
        transition: 'background 0.15s ease',
      },
    });
    barEls.push(barEl);
    waveformContainer.appendChild(barEl);
  }

  // Click-to-seek on waveform
  waveformContainer.addEventListener('click', (e: MouseEvent) => {
    if (!audioEl || !audioEl.duration) return;
    const rect = waveformContainer.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEl.currentTime = ratio * audioEl.duration;
    progressRatio = ratio;
    updateBars();
  });

  // Time label — shows elapsed / total while playing, just total when idle
  const timeLabel = h('span', {
    style: {
      fontSize: 'clamp(10px, 2.6vw, 11px)',
      color: subColor,
      fontFamily: 'var(--font-body)',
      fontVariantNumeric: 'tabular-nums',
      flexShrink: '0',
      minWidth: '32px',
      textAlign: 'right',
    },
  }, durationStr);

  // Speed pill button
  const speedPill = h('button', {
    style: {
      width: '28px',
      height: '18px',
      borderRadius: '9px',
      background: isOwnMessage ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
      border: 'none',
      cursor: 'pointer',
      fontSize: '10px',
      fontWeight: '600',
      color: isOwnMessage ? 'rgba(255,255,255,0.85)' : '#aaa',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      padding: '0',
    },
  }, currentSpeed === 1 ? '1x' : `${currentSpeed}x`);

  speedPill.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    const idx = VOICE_SPEED_STEPS.indexOf(currentSpeed);
    currentSpeed = VOICE_SPEED_STEPS[(idx + 1) % VOICE_SPEED_STEPS.length];
    speedPill.textContent = currentSpeed === 1 ? '1x' : `${currentSpeed}x`;
    try { localStorage.setItem(VOICE_SPEED_LS_KEY, String(currentSpeed)); } catch { /* noop */ }
    if (audioEl) audioEl.playbackRate = currentSpeed;
  });

  function updateBars() {
    for (let i = 0; i < barCount; i++) {
      const ratio = i / barCount;
      barEls[i].style.background = ratio <= progressRatio ? barActiveColor : barInactiveColor;
    }
  }

  function fmtElapsedAndTotal(): string {
    if (!audioEl) return durationStr;
    const elapsed = Math.floor(audioEl.currentTime * 1000);
    return `${fmtDuration(elapsed)} / ${durationStr}`;
  }

  playBtn.addEventListener('click', () => {
    if (!httpUrl) return;
    if (!audioEl) {
      audioEl = new Audio(httpUrl);
      audioEl.playbackRate = currentSpeed;
      audioEl.addEventListener('timeupdate', () => {
        if (audioEl && audioEl.duration) {
          progressRatio = audioEl.currentTime / audioEl.duration;
          timeLabel.textContent = fmtElapsedAndTotal();
          updateBars();
        }
      });
      audioEl.addEventListener('ended', () => {
        isPlaying = false;
        playBtn.textContent = '\u25B6';
        progressRatio = 0;
        timeLabel.textContent = durationStr;
        updateBars();
      });
    }

    if (isPlaying) {
      audioEl.pause();
      playBtn.textContent = '\u25B6';
      isPlaying = false;
    } else {
      audioEl.playbackRate = currentSpeed;
      audioEl.play();
      playBtn.textContent = '\u23F8';
      isPlaying = true;
    }
  });

  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 0',
      minHeight: '44px',
    },
  }, playBtn, waveformContainer, timeLabel, speedPill);
}

function buildAudioContent(event: any, isOwnMessage: boolean): HTMLElement {
  // Check if it's a voice note (MSC3245)
  if (event.content?.['org.matrix.msc3245.voice']) {
    return buildVoiceNote(event, isOwnMessage);
  }

  // Regular audio file — render as file download
  const duration = event.content?.info?.duration;
  const durationStr = duration ? fmtDuration(duration) : '';
  const filename = event.content?.body || 'Audio';
  const mxcUrl = event.content?.url;
  const httpUrl = mxcUrl ? mxcToHttp(mxcUrl) : '#';

  return h('a', {
    href: httpUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      textDecoration: 'none',
      color: 'inherit',
      padding: '6px 0',
      minHeight: '44px',
    },
  },
    h('span', { style: { fontSize: '20px' } }, '\u{1F3B5}'),
    h('div', { style: { flex: '1' } },
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontWeight: '500',
          fontSize: 'clamp(13px, 3.2vw, 14px)',
        },
      }, filename),
      durationStr
        ? h('div', { style: { fontSize: '11px', color: isOwnMessage ? 'rgba(255,255,255,0.6)' : '#888' } }, durationStr)
        : document.createTextNode(''),
    ),
  );
}

/** URL regex for detecting links in message text */
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

function buildTextContent(event: any): HTMLElement {
  let body: string = event.content?.body || '';

  // Strip reply fallback lines (lines starting with "> ")
  const hasReply = event.content?.['m.relates_to']?.['m.in_reply_to'];
  if (hasReply && body.includes('\n')) {
    const lines = body.split('\n');
    let start = 0;
    while (start < lines.length && lines[start].startsWith('> ')) start++;
    // Skip the blank line after quote block
    if (start < lines.length && lines[start].trim() === '') start++;
    body = lines.slice(start).join('\n');
  }

  const container = h('div', {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(14px, 3.6vw, 15px)',
      lineHeight: '1.45',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
    },
  });

  // Split text by URLs and create clickable links
  const parts = body.split(URL_REGEX);
  const urls = body.match(URL_REGEX) || [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      container.appendChild(document.createTextNode(parts[i]));
    }
    if (i < urls.length) {
      const link = h('span', {
        style: {
          color: '#64B5F6',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(100,181,246,0.4)',
          cursor: 'pointer',
        },
        onClick: (e: Event) => {
          e.stopPropagation();
          openInAppBrowser(urls[i]);
        },
      }, urls[i]);
      container.appendChild(link);
    }
  }

  return container;
}

function buildReactions(
  event: any,
  isOwnMessage: boolean,
  callbacks?: MessageCallbacks,
): HTMLElement | null {
  const reactions: Record<string, { count: number; byUser: boolean }> = {};

  // Reactions are stored as unsigned.m.relations.m.annotation.chunk
  const chunk = event.unsigned?.['m.relations']?.['m.annotation']?.chunk;
  if (!chunk || !Array.isArray(chunk) || chunk.length === 0) return null;

  for (const r of chunk) {
    const key = r.key;
    if (!key) continue;
    if (!reactions[key]) reactions[key] = { count: 0, byUser: false };
    reactions[key].count += r.count || 1;
    // Some homeservers provide origin_server_ts or a flag for own reaction
    if (r.byUser) reactions[key].byUser = true;
  }

  if (Object.keys(reactions).length === 0) return null;

  const container = h('div', {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      marginTop: '4px',
      justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
    },
  });

  for (const [emoji, data] of Object.entries(reactions)) {
    const pill = h('button', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 7px',
        borderRadius: '12px',
        border: data.byUser ? '1px solid #D4A017' : '1px solid rgba(255,255,255,0.12)',
        background: data.byUser ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.05)',
        color: '#e0e0e0',
        fontSize: '13px',
        cursor: 'pointer',
        minHeight: '26px',
        lineHeight: '1',
        fontFamily: 'var(--font-body)',
      },
    },
      h('span', {}, emoji),
      data.count > 1 ? h('span', { style: { fontSize: '11px' } }, String(data.count)) : document.createTextNode(''),
    );

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks?.onReaction?.(event.event_id, emoji);
    });

    container.appendChild(pill);
  }

  return container;
}

function buildReadReceipt(isOwnMessage: boolean, event: any): HTMLElement | null {
  if (!isOwnMessage) return null;

  // Determine receipt status from event metadata
  const status = event._receiptStatus // custom field we may set
    || (event.unsigned?.transaction_id ? 'sent' : 'delivered');

  let icon = '\u2713'; // single check - sent
  let color = 'rgba(255,255,255,0.45)';

  if (status === 'delivered') {
    icon = '\u2713\u2713';
    color = 'rgba(255,255,255,0.5)';
  } else if (status === 'read') {
    icon = '\u2713\u2713';
    color = '#4FC3F7'; // blue for read
  }

  return h('span', {
    style: {
      fontSize: '11px',
      color,
      marginLeft: '2px',
      lineHeight: '1',
    },
  }, icon);
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

function showToast(message: string): void {
  const existing = document.querySelector('.msg-toast');
  if (existing) existing.remove();

  const toast = h('div', {
    className: 'msg-toast',
    style: {
      position: 'fixed',
      bottom: '120px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.85)',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: '24px',
      fontSize: '13px',
      fontFamily: 'var(--font-body)',
      zIndex: '200',
      pointerEvents: 'none',
      transition: 'opacity 0.3s ease',
      whiteSpace: 'nowrap',
    },
  }, message);

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ---------------------------------------------------------------------------
// Context Menu (Bottom Sheet)
// ---------------------------------------------------------------------------

function showContextMenu(
  event: any,
  isOwnMessage: boolean,
  callbacks?: MessageCallbacks,
): void {
  // Remove any existing menu
  const existing = document.querySelector('.ctx-menu-overlay');
  if (existing) existing.remove();

  // Inject keyframes if not present
  if (!document.getElementById('ctx-menu-styles')) {
    const style = document.createElement('style');
    style.id = 'ctx-menu-styles';
    style.textContent = `
      @keyframes ctxSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @keyframes ctxFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  function dismiss() {
    sheet.style.transform = 'translateY(100%)';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  }

  // --- Overlay ---
  const overlay = h('div', {
    className: 'ctx-menu-overlay',
    style: {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.5)',
      zIndex: '100',
      animation: 'ctxFadeIn 0.2s ease-out',
    },
    onClick: () => dismiss(),
  });

  // --- Bottom sheet ---
  const sheet = h('div', {
    className: 'ctx-menu-sheet',
    style: {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      background: '#141414',
      borderRadius: '20px 20px 0 0',
      zIndex: '101',
      paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      animation: 'ctxSlideUp 0.25s ease-out',
      transition: 'transform 0.2s ease-in',
    },
    onClick: (e: Event) => e.stopPropagation(),
  });

  // --- Handle bar ---
  sheet.appendChild(h('div', {
    style: {
      width: '36px',
      height: '4px',
      borderRadius: '2px',
      background: 'rgba(255,255,255,0.2)',
      margin: '10px auto 6px',
    },
  }));

  // --- Quick reactions row ---
  const reactionsRow = h('div', {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: '4px',
      padding: '8px 16px 12px',
    },
  });

  for (const emoji of QUICK_REACTIONS) {
    const btn = h('button', {
      style: {
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'rgba(255,255,255,0.06)',
        fontSize: '22px',
        cursor: 'pointer',
        borderRadius: '50%',
        padding: '0',
        transition: 'background 0.15s ease',
      },
    }, emoji);

    btn.addEventListener('click', () => {
      callbacks?.onReaction?.(event.event_id, emoji);
      dismiss();
    });

    reactionsRow.appendChild(btn);
  }

  sheet.appendChild(reactionsRow);

  // --- Divider ---
  sheet.appendChild(h('div', {
    style: {
      height: '1px',
      background: 'rgba(255,255,255,0.08)',
      margin: '0 16px',
    },
  }));

  // --- Action rows ---
  const actions: { icon: string; label: string; color?: string; handler: () => void }[] = [
    {
      icon: '\u21A9\uFE0F',
      label: 'Reply',
      handler: () => { callbacks?.onReply?.(event); dismiss(); },
    },
    {
      icon: '\uD83D\uDCCB',
      label: 'Copy',
      handler: () => {
        navigator.clipboard.writeText(event.content?.body || '').then(() => {
          showToast('Message copied');
        }).catch(() => {
          showToast('Failed to copy');
        });
        dismiss();
      },
    },
    {
      icon: '\u2197\uFE0F',
      label: 'Forward',
      handler: () => {
        navigator.clipboard.writeText(event.content?.body || '').then(() => {
          showToast('Message copied \u2014 paste in another chat');
        }).catch(() => {
          showToast('Failed to copy');
        });
        callbacks?.onForward?.(event);
        dismiss();
      },
    },
  ];

  if (isOwnMessage) {
    actions.push({
      icon: '\u270F\uFE0F',
      label: 'Edit',
      handler: () => { callbacks?.onEdit?.(event); dismiss(); },
    });
    actions.push({
      icon: '\uD83D\uDDD1\uFE0F',
      label: 'Delete',
      color: '#CE1126',
      handler: () => { callbacks?.onDelete?.(event); dismiss(); },
    });
  }

  const actionsContainer = h('div', {
    style: { padding: '4px 0' },
  });

  for (const action of actions) {
    const row = h('button', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        height: '52px',
        padding: '0 20px',
        border: 'none',
        background: 'transparent',
        color: action.color || '#e0e0e0',
        fontSize: '15px',
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s ease',
      },
    },
      h('span', { style: { fontSize: '18px', width: '24px', textAlign: 'center' } }, action.icon),
      h('span', {}, action.label),
    );

    row.addEventListener('pointerenter', () => { row.style.background = 'rgba(255,255,255,0.06)'; });
    row.addEventListener('pointerleave', () => { row.style.background = 'transparent'; });
    row.addEventListener('click', action.handler);
    actionsContainer.appendChild(row);
  }

  sheet.appendChild(actionsContainer);

  // --- Divider ---
  sheet.appendChild(h('div', {
    style: {
      height: '1px',
      background: 'rgba(255,255,255,0.08)',
      margin: '0 16px',
    },
  }));

  // --- Cancel button ---
  const cancelBtn = h('button', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '52px',
      padding: '0 20px',
      border: 'none',
      background: 'transparent',
      color: '#999',
      fontSize: '15px',
      fontFamily: 'var(--font-body)',
      cursor: 'pointer',
    },
  }, 'Cancel');

  cancelBtn.addEventListener('click', () => dismiss());
  sheet.appendChild(cancelBtn);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// Swipe-to-reply gesture
// ---------------------------------------------------------------------------

function attachSwipeToReply(
  el: HTMLElement,
  event: any,
  callbacks?: MessageCallbacks,
): void {
  if (!callbacks?.onReply) return;

  let startX = 0;
  let startY = 0;
  let swiping = false;
  let triggered = false;
  const threshold = 60;

  el.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    swiping = false;
    triggered = false;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (triggered) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = Math.abs(touch.clientY - startY);

    // Only horizontal swipe (right)
    if (dx > 10 && dy < 30) {
      swiping = true;
    }

    if (swiping && dx > 0) {
      const clamped = Math.min(dx, threshold + 20);
      el.style.transform = `translateX(${clamped}px)`;
      el.style.transition = 'none';

      if (dx >= threshold && !triggered) {
        triggered = true;
        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(15);
      }
    }
  }, { passive: true });

  el.addEventListener('touchend', () => {
    el.style.transition = 'transform 0.2s ease-out';
    el.style.transform = 'translateX(0)';

    if (triggered) {
      callbacks.onReply!(event);
    }

    swiping = false;
    triggered = false;
  }, { passive: true });
}

// ---------------------------------------------------------------------------
// Poll helpers
// ---------------------------------------------------------------------------

interface PollData {
  question: string;
  options: string[];
  pollId: string;
  createdBy: string;
}

/** Parse poll data from event body */
function parsePollData(event: any): PollData | null {
  const body = event.content?.body || '';
  if (!body.startsWith('[poll]')) return null;
  try {
    const data = JSON.parse(body.slice('[poll]'.length));
    if (data.question && Array.isArray(data.options) && data.pollId) {
      return data as PollData;
    }
  } catch { /* ignore */ }
  return null;
}

/** Check if event is a poll vote (should be hidden) */
export function isPollVoteEvent(event: any): boolean {
  const body = event.content?.body || '';
  return body.startsWith('[poll-vote]');
}

/** Track votes per poll, keyed by pollId */
const pollVoteStore = new Map<string, Map<number, Set<string>>>();
const userPollVotes = new Map<string, number>(); // `${pollId}:${userId}` -> optionIndex

export function recordPollVote(event: any): void {
  const body = event.content?.body || '';
  const match = body.match(/\[poll-vote\]\{([^}]+)\}:(\d+)/);
  if (!match) return;
  const pollId = match[1];
  const optIdx = parseInt(match[2], 10);
  const sender = event.sender || '';

  if (!pollVoteStore.has(pollId)) pollVoteStore.set(pollId, new Map());
  const pollVotes = pollVoteStore.get(pollId)!;
  if (!pollVotes.has(optIdx)) pollVotes.set(optIdx, new Set());
  pollVotes.get(optIdx)!.add(sender);
  userPollVotes.set(`${pollId}:${sender}`, optIdx);
}

function buildPollContent(event: any, isOwnMessage: boolean): HTMLElement {
  const poll = parsePollData(event)!;
  const roomId = event.room_id || '';
  const currentUserId = (() => {
    try {
      const raw = localStorage.getItem('os_mobile_credentials');
      if (raw) {
        const creds = JSON.parse(raw);
        return creds.userId || creds.user_id || '';
      }
    } catch { /* ignore */ }
    return '';
  })();

  const userVoteKey = `${poll.pollId}:${currentUserId}`;
  const hasVoted = userPollVotes.has(userVoteKey);
  const userVoteIdx = userPollVotes.get(userVoteKey) ?? -1;

  // Gather vote counts
  const pollVotes = pollVoteStore.get(poll.pollId);
  let totalVotes = 0;
  const optionCounts: number[] = poll.options.map((_, idx) => {
    const count = pollVotes?.get(idx)?.size ?? 0;
    totalVotes += count;
    return count;
  });

  const container = h('div', {
    style: {
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '6px',
      border: isOwnMessage
        ? '1px solid rgba(255,255,255,0.12)'
        : '1px solid var(--border)',
      background: isOwnMessage
        ? 'rgba(255,255,255,0.06)'
        : 'var(--surface)',
      minWidth: '200px',
      maxWidth: '260px',
    },
  });

  // Header
  container.appendChild(h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      borderBottom: isOwnMessage
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid var(--border)',
    },
  },
    h('span', { style: { fontSize: '13px' } }, '\u{1F4CA}'),
    h('span', {
      style: {
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--gold)',
        fontFamily: 'var(--font-display)',
      },
    }, 'Quick Poll'),
  ));

  // Question
  container.appendChild(h('div', {
    style: {
      padding: '10px 12px 6px',
    },
  },
    h('div', {
      style: {
        fontSize: '13px',
        fontWeight: '600',
        lineHeight: '1.4',
        color: isOwnMessage ? '#fff' : 'var(--text)',
        fontFamily: 'var(--font-body)',
      },
    }, poll.question),
  ));

  // Options
  const optionsContainer = h('div', {
    style: {
      padding: '0 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
  });

  poll.options.forEach((option, idx) => {
    const count = optionCounts[idx];
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const isSelected = userVoteIdx === idx;

    if (hasVoted) {
      // Results view
      const optEl = h('div', {
        style: {
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          minHeight: '32px',
          background: isOwnMessage ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
        },
      });

      // Progress bar fill
      optEl.appendChild(h('div', {
        style: {
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          width: `${pct}%`,
          borderRadius: '8px',
          background: isSelected
            ? 'linear-gradient(90deg, rgba(212,160,23,0.35), rgba(212,160,23,0.15))'
            : 'rgba(255,255,255,0.06)',
          transition: 'width 0.5s ease-out',
        },
      }));

      // Content
      const content = h('div', {
        style: {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
        },
      });

      const labelRow = h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          minWidth: '0',
        },
      });

      if (isSelected) {
        labelRow.appendChild(h('span', {
          style: { color: 'var(--gold)', fontSize: '12px', flexShrink: '0' },
        }, '\u2713'));
      }

      labelRow.appendChild(h('span', {
        style: {
          fontSize: '12px',
          color: isOwnMessage ? 'rgba(255,255,255,0.9)' : 'var(--text)',
          fontWeight: isSelected ? '600' : '400',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, option));

      content.appendChild(labelRow);
      content.appendChild(h('span', {
        style: {
          fontSize: '10px',
          fontWeight: '500',
          color: isOwnMessage ? 'rgba(255,255,255,0.5)' : '#999',
          marginLeft: '8px',
          flexShrink: '0',
          fontFamily: 'var(--font-body)',
        },
      }, `${pct}% (${count})`));

      optEl.appendChild(content);
      optionsContainer.appendChild(optEl);
    } else {
      // Votable button
      const btn = h('button', {
        style: {
          width: '100%',
          textAlign: 'left',
          borderRadius: '8px',
          padding: '8px 10px',
          background: isOwnMessage ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
          border: isOwnMessage
            ? '1px solid rgba(255,255,255,0.12)'
            : '1px solid var(--border)',
          cursor: 'pointer',
          fontSize: '12px',
          color: isOwnMessage ? 'rgba(255,255,255,0.9)' : 'var(--text)',
          fontFamily: 'var(--font-body)',
          transition: 'all 0.15s',
        },
      }, option);

      btn.addEventListener('touchstart', () => {
        btn.style.borderColor = 'var(--gold)';
        btn.style.background = 'rgba(212,160,23,0.1)';
      }, { passive: true });

      btn.addEventListener('touchend', () => {
        btn.style.borderColor = isOwnMessage ? 'rgba(255,255,255,0.12)' : 'var(--border)';
        btn.style.background = isOwnMessage ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)';
      }, { passive: true });

      btn.addEventListener('click', () => {
        // Record vote locally immediately
        if (!pollVoteStore.has(poll.pollId)) pollVoteStore.set(poll.pollId, new Map());
        const pv = pollVoteStore.get(poll.pollId)!;
        if (!pv.has(idx)) pv.set(idx, new Set());
        pv.get(idx)!.add(currentUserId);
        userPollVotes.set(userVoteKey, idx);

        // Send vote to server
        matrixSendPollVote(roomId, poll.pollId, idx, option).catch(() => {});

        // Re-render this poll card by replacing the options container content
        const parentCard = container;
        const oldOptions = parentCard.querySelector('[data-poll-options]');
        if (oldOptions) {
          // Rebuild with results
          const newCard = buildPollContent(event, isOwnMessage);
          parentCard.replaceWith(newCard);
        }
      });

      optionsContainer.appendChild(btn);
    }
  });

  optionsContainer.setAttribute('data-poll-options', 'true');
  container.appendChild(optionsContainer);

  // Footer
  container.appendChild(h('div', {
    style: {
      padding: '6px 12px',
      borderTop: isOwnMessage
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid var(--border)',
    },
  },
    h('span', {
      style: {
        fontSize: '10px',
        color: isOwnMessage ? 'rgba(255,255,255,0.4)' : '#777',
        fontFamily: 'var(--font-body)',
      },
    }, `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}${!hasVoted ? ' \u2022 Tap to vote' : ''}`),
  ));

  return container;
}

// ---------------------------------------------------------------------------
// MoMo Request card
// ---------------------------------------------------------------------------

const MOMO_PROVIDERS: Record<string, { name: string; color: string; bg: string }> = {
  'mtn-momo': { name: 'MTN MoMo', color: '#FFCC00', bg: 'rgba(255,204,0,0.15)' },
  'telecel-cash': { name: 'Telecel Cash', color: '#0066CC', bg: 'rgba(0,102,204,0.12)' },
  'airteltigo-money': { name: 'AirtelTigo Money', color: '#E40000', bg: 'rgba(228,0,0,0.10)' },
};

const MOMO_USSD: Record<string, { code: string; steps: string[] }> = {
  'mtn-momo': {
    code: '*170#',
    steps: ['Dial *170#', 'Option 1: Transfer Money', 'Select MoMo User', 'Enter recipient number', 'Enter amount', 'Confirm with PIN'],
  },
  'telecel-cash': {
    code: '*110#',
    steps: ['Dial *110#', 'Select Send Money', 'Enter recipient number', 'Enter amount', 'Confirm with PIN'],
  },
  'airteltigo-money': {
    code: '*500#',
    steps: ['Dial *500#', 'Select Send Money', 'Enter recipient number', 'Enter amount', 'Confirm with PIN'],
  },
};

function buildMoMoRequestContent(event: any, isOwn: boolean): HTMLElement {
  const c = event.content || {};
  const amount = (c.amount || 0).toFixed(2);
  const note = c.note || '';
  const provider = c.provider || 'mtn-momo';
  const status = c.status || 'pending';
  const pInfo = MOMO_PROVIDERS[provider] || MOMO_PROVIDERS['mtn-momo'];

  const statusColors: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: '#D97706', bg: 'rgba(217,119,6,0.12)', label: 'Pending' },
    completed: { color: '#059669', bg: 'rgba(5,150,105,0.12)', label: 'Completed' },
    declined: { color: '#DC2626', bg: 'rgba(220,38,38,0.12)', label: 'Declined' },
  };
  const sCfg = statusColors[status] || statusColors.pending;

  const card = h('div', {
    style: {
      borderLeft: '4px solid #D4A017',
      background: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(212,160,23,0.06)',
      borderRadius: '12px',
      overflow: 'hidden',
      maxWidth: '280px',
    },
  },
    // Header
    h('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid rgba(212,160,23,0.12)',
      },
    },
      h('span', { style: { fontSize: '11px', fontWeight: '700', color: isOwn ? 'rgba(255,255,255,0.9)' : '#D4A017' } }, '\uD83D\uDCB0 Money Request'),
      h('span', {
        style: {
          fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px',
          color: sCfg.color, background: sCfg.bg,
        },
      }, sCfg.label),
    ),
    // Amount
    h('div', { style: { padding: '12px', textAlign: 'center' } },
      h('div', {
        style: { fontSize: '22px', fontWeight: '800', color: isOwn ? '#fff' : 'var(--text-primary, #1a1a1a)' },
      }, `GH\u20B5${amount}`),
      note ? h('div', {
        style: { fontSize: '11px', marginTop: '4px', color: isOwn ? 'rgba(255,255,255,0.7)' : '#888' },
      }, note) : document.createTextNode(''),
    ),
    // Provider
    h('div', { style: { display: 'flex', justifyContent: 'center', paddingBottom: '8px' } },
      h('span', {
        style: {
          fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px',
          color: pInfo.color, background: pInfo.bg,
        },
      }, pInfo.name),
    ),
  );

  // Action buttons for receiver + pending
  if (!isOwn && status === 'pending') {
    const ussd = MOMO_USSD[provider] || MOMO_USSD['mtn-momo'];
    let ussdExpanded = false;

    const ussdSection = h('div', {
      style: { display: 'none', padding: '10px 12px', borderTop: '1px solid rgba(212,160,23,0.08)', background: 'rgba(0,0,0,0.03)' },
    });

    // Build USSD steps
    const ussdCode = h('div', {
      style: {
        textAlign: 'center', padding: '8px', marginBottom: '8px', borderRadius: '8px',
        background: 'var(--surface-2, #f5f5f5)', fontSize: '20px', fontWeight: '800',
        fontFamily: 'monospace', color: pInfo.color, letterSpacing: '2px',
      },
    }, ussd.code);
    ussdSection.appendChild(ussdCode);

    ussd.steps.forEach((step, i) => {
      ussdSection.appendChild(h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
      },
        h('span', {
          style: {
            width: '18px', height: '18px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '9px',
            fontWeight: '700', color: pInfo.color, background: pInfo.bg, flexShrink: '0',
          },
        }, String(i + 1)),
        h('span', { style: { fontSize: '11px', color: 'var(--text-primary, #333)' } }, step),
      ));
    });

    // Copy amount button
    const copyBtn = h('button', {
      style: {
        width: '100%', padding: '8px', marginTop: '8px', borderRadius: '8px',
        border: '1px solid var(--border-1, #ddd)', background: 'var(--surface-2, #f5f5f5)',
        fontSize: '11px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-primary, #333)',
      },
    }, `\uD83D\uDCCB Copy amount: GH\u20B5${amount}`);
    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(amount).then(() => {
        copyBtn.textContent = '\u2705 Copied!';
        setTimeout(() => { copyBtn.textContent = `\uD83D\uDCCB Copy amount: GH\u20B5${amount}`; }, 1500);
      });
    });
    ussdSection.appendChild(copyBtn);

    card.appendChild(ussdSection);

    // Buttons row
    const btnRow = h('div', {
      style: { display: 'flex', gap: '8px', padding: '10px 12px', borderTop: '1px solid rgba(212,160,23,0.12)' },
    },
      (() => {
        const payBtn = h('button', {
          style: {
            flex: '1', padding: '10px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #D4A017, #B8860B)', color: '#fff',
            fontSize: '11px', fontWeight: '700', cursor: 'pointer',
          },
        }, '\uD83D\uDCB0 Pay via MoMo');
        payBtn.addEventListener('click', () => {
          ussdExpanded = !ussdExpanded;
          ussdSection.style.display = ussdExpanded ? 'block' : 'none';
          payBtn.textContent = ussdExpanded ? '\u25B2 Hide instructions' : '\uD83D\uDCB0 Pay via MoMo';
        });
        return payBtn;
      })(),
      (() => {
        const declineBtn = h('button', {
          style: {
            padding: '10px 16px', borderRadius: '10px', border: 'none',
            background: 'rgba(220,38,38,0.08)', color: '#DC2626',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer',
          },
        }, '\u2716 Decline');
        return declineBtn;
      })(),
    );
    card.appendChild(btnRow);
  }

  return card;
}

// ---------------------------------------------------------------------------
// MoMo Receipt card
// ---------------------------------------------------------------------------

function buildMoMoReceiptContent(event: any, isOwn: boolean): HTMLElement {
  const c = event.content || {};
  const amount = (c.amount || 0).toFixed(2);
  const note = c.note || '';
  const provider = c.provider || 'mtn-momo';
  const txnId = c.transactionId || 'N/A';
  const ts = c.timestamp || event.origin_server_ts || Date.now();
  const pInfo = MOMO_PROVIDERS[provider] || MOMO_PROVIDERS['mtn-momo'];

  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let hr = d.getHours(); const mn = d.getMinutes().toString().padStart(2,'0');
  const ampm = hr >= 12 ? 'PM' : 'AM'; hr = hr % 12 || 12;
  const timeStr = `${d.getDate()} ${months[d.getMonth()]}, ${hr}:${mn} ${ampm}`;

  return h('div', {
    style: {
      borderLeft: '4px solid #006B3F', background: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(0,107,63,0.05)',
      borderRadius: '12px', overflow: 'hidden', maxWidth: '280px',
    },
  },
    // Header
    h('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 12px', borderBottom: '1px solid rgba(0,107,63,0.12)',
      },
    },
      h('span', { style: { fontSize: '11px', fontWeight: '700', color: isOwn ? 'rgba(255,255,255,0.9)' : '#059669' } }, '\u2705 Payment Confirmed'),
    ),
    // Amount
    h('div', { style: { padding: '12px', textAlign: 'center' } },
      h('div', {
        style: { fontSize: '22px', fontWeight: '800', color: isOwn ? '#fff' : 'var(--text-primary, #1a1a1a)' },
      }, `GH\u20B5${amount}`),
      note ? h('div', {
        style: { fontSize: '11px', marginTop: '4px', color: isOwn ? 'rgba(255,255,255,0.7)' : '#888' },
      }, note) : document.createTextNode(''),
    ),
    // Details
    h('div', { style: { padding: '0 12px 8px', fontSize: '10px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } },
        h('span', { style: { color: isOwn ? 'rgba(255,255,255,0.5)' : '#888' } }, 'Provider'),
        h('span', {
          style: { fontWeight: '700', padding: '1px 8px', borderRadius: '99px', color: pInfo.color, background: pInfo.bg },
        }, pInfo.name),
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } },
        h('span', { style: { color: isOwn ? 'rgba(255,255,255,0.5)' : '#888' } }, 'Ref'),
        h('span', { style: { fontFamily: 'monospace', color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--text-primary, #333)' } }, txnId),
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
        h('span', { style: { color: isOwn ? 'rgba(255,255,255,0.5)' : '#888' } }, 'Time'),
        h('span', { style: { color: isOwn ? 'rgba(255,255,255,0.7)' : '#888' } }, timeStr),
      ),
    ),
    // Footer
    h('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '6px 12px', borderTop: '1px solid rgba(0,107,63,0.08)', fontSize: '9px', color: '#059669',
      },
    }, '\uD83E\uDDFE Mobile money receipt'),
  );
}

// ---------------------------------------------------------------------------
// Ghanaian Sticker rendering (mobile)
// ---------------------------------------------------------------------------

interface MobileStickerDef {
  text: string;
  bg: string;
  textColor: string;
  face: string;
  fontSize?: number;
  type: 'expression' | 'adinkra' | 'life';
  svgPath?: string;
}

const MOBILE_STICKER_MAP: Record<string, Record<string, MobileStickerDef>> = {
  'ghana-expressions': {
    'charley': { text: 'Charley!', bg: '#D4A017', textColor: '#1A1A2E', face: '\uD83D\uDE04', type: 'expression' },
    'eiii': { text: 'Eiii!', bg: '#CE1126', textColor: '#fff', face: '\uD83D\uDE32', type: 'expression' },
    'as-for-you': { text: 'As for you!', bg: '#006B3F', textColor: '#fff', face: '\uD83D\uDE24', type: 'expression', fontSize: 14 },
    'chale-relax': { text: 'Chale, relax', bg: '#2E86AB', textColor: '#fff', face: '\uD83D\uDE0C', type: 'expression', fontSize: 13 },
    'herh': { text: 'Herh!', bg: '#CE1126', textColor: '#fff', face: '\uD83D\uDE28', type: 'expression' },
    'wey-dey': { text: 'Wey dey!', bg: '#006B3F', textColor: '#D4A017', face: '\u270C\uFE0F', type: 'expression' },
    'i-beg': { text: 'I beg', bg: '#D4A017', textColor: '#1A1A2E', face: '\uD83D\uDE4F', type: 'expression' },
    'yoo-i-hear': { text: 'Yoo, I hear', bg: '#3A506B', textColor: '#fff', face: '\uD83D\uDC4D', type: 'expression', fontSize: 13 },
    'no-wahala': { text: 'No wahala', bg: '#006B3F', textColor: '#fff', face: '\u2728', type: 'expression' },
    'the-thing-is': { text: 'The thing is...', bg: '#5C2D91', textColor: '#fff', face: '\uD83E\uDD14', type: 'expression', fontSize: 12 },
    'me-im-coming': { text: "Me I'm coming", bg: '#D4A017', textColor: '#1A1A2E', face: '\uD83C\uDFC3', type: 'expression', fontSize: 12 },
    'abi': { text: 'Abi?', bg: '#CE1126', textColor: '#fff', face: '\uD83E\uDEE4', type: 'expression' },
    'make-i-tell-you': { text: 'Make I tell you...', bg: '#1B4332', textColor: '#D4A017', face: '\u261D\uFE0F', type: 'expression', fontSize: 11 },
    'keke': { text: 'K\u025Bk\u025B!', bg: '#D4A017', textColor: '#1A1A2E', face: '\uD83D\uDCAF', type: 'expression' },
    'paper-dey': { text: 'Paper dey!', bg: '#006B3F', textColor: '#D4A017', face: '\uD83D\uDCB5', type: 'expression' },
    'wo-maame': { text: 'Wo maame', bg: '#8B0000', textColor: '#fff', face: '\uD83D\uDE0F', type: 'expression' },
    'i-shock': { text: 'I shock!', bg: '#CE1126', textColor: '#fff', face: '\u26A1', type: 'expression' },
    'heavy': { text: 'Heavy!', bg: '#1A1A2E', textColor: '#D4A017', face: '\uD83D\uDCAA', type: 'expression' },
    'die-be-die': { text: 'Die be die', bg: '#CE1126', textColor: '#fff', face: '\uD83D\uDD25', type: 'expression' },
    'tweaaa': { text: 'Tweaaa!', bg: '#4A154B', textColor: '#fff', face: '\uD83D\uDE44', type: 'expression' },
  },
  'adinkra-vibes': {
    'gye-nyame': { text: 'Gye Nyame', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M20 4C12 4 6 10 6 18c0 5 3 9 8 12 2-1 4-3 4-6-2-1-4-3-4-6 0-4 3-7 6-7s6 3 6 7c0 3-2 5-4 6 0 3 2 5 4 6 5-3 8-7 8-12C34 10 28 4 20 4z' },
    'sankofa': { text: 'Sankofa', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M28 10c-4-3-9-2-12 1l-2 3c-1 2 0 4 2 4h3l-5 6c-1 1-1 3 1 3l8-4c3-1 5-4 5-7v-2c2-1 2-3 0-4zM16 28c-2 0-3-1-3-3s1-3 3-3 3 1 3 3-1 3-3 3z' },
    'dwennimmen': { text: 'Dwennimmen', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M20 8v24M8 20h24M12 12c0 4 3 8 8 8M28 12c0 4-3 8-8 8M12 28c0-4 3-8 8-8M28 28c0-4-3-8-8-8' },
    'aya': { text: 'Aya', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M20 6l8 14-8 14-8-14zM20 6v28M12 20h16' },
    'akoma': { text: 'Akoma', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M20 34c-1-1-14-9-14-18 0-5 4-9 8-9 3 0 5 2 6 4 1-2 3-4 6-4 4 0 8 4 8 9 0 9-13 17-14 18z' },
    'nkyinkyim': { text: 'Nkyinkyim', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M10 8l5 6-5 6 5 6-5 6M30 8l-5 6 5 6-5 6 5 6M16 8h8M16 20h8M16 32h8' },
    'fawohodie': { text: 'Fawohodie', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M20 8v24M14 14l-6-4M26 14l6-4M14 26l-6 4M26 26l6 4M16 18h8v4h-8z' },
    'ese-ne-tekrema': { text: 'Ese Ne Tekrema', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M10 16h20v2H10zM10 22h20v2H10zM14 16v8M20 16v8M26 16v8M16 12c0-2 2-4 4-4s4 2 4 4M16 28c0 2 2 4 4 4s4-2 4-4' },
    'mate-masie': { text: 'Mate Masie', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M16 14a6 8 0 1 1 0 12 6 8 0 1 1 0-12zM24 14a6 8 0 1 1 0 12 6 8 0 1 1 0-12z' },
    'bese-saka': { text: 'Bese Saka', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M14 14a3 3 0 1 0 0 .1M20 14a3 3 0 1 0 0 .1M26 14a3 3 0 1 0 0 .1M14 22a3 3 0 1 0 0 .1M20 22a3 3 0 1 0 0 .1M26 22a3 3 0 1 0 0 .1M14 30a3 3 0 1 0 0 .1M20 30a3 3 0 1 0 0 .1M26 30a3 3 0 1 0 0 .1' },
    'denkyem': { text: 'Denkyem', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M8 20c4-8 10-10 16-8 2 0 4 2 4 4s-2 4-4 4c-6 2-12 0-16 8M12 16l-2-4M12 24l-2 4M30 18a2 2 0 1 0 0 .1' },
    'woforo-dua-pa-a': { text: 'Woforo Dua Pa A', bg: '#1A1A2E', textColor: '#D4A017', face: '', type: 'adinkra', svgPath: 'M20 34v-20M20 14c-6-4-10-6-10-10M20 14c6-4 10-6 10-10M14 20c-4-2-6-4-6-6M26 20c4-2 6-4 6-6M16 34h8' },
  },
  'ghana-life': {
    'jollof-rice': { text: 'Jollof Rice', bg: '#FFF3E0', textColor: '#CE1126', face: '\uD83C\uDF5B', type: 'life' },
    'trotro': { text: 'Trotro', bg: '#E3F2FD', textColor: '#1565C0', face: '\uD83D\uDE8C', type: 'life' },
    'star-beer': { text: 'Star Beer', bg: '#FFFDE7', textColor: '#2E7D32', face: '\uD83C\uDF7A', type: 'life' },
    'fufu': { text: 'Fufu', bg: '#FFF8E1', textColor: '#5D4037', face: '\uD83C\uDF5C', type: 'life' },
    'waakye': { text: 'Waakye', bg: '#F3E5F5', textColor: '#CE1126', face: '\uD83C\uDF5B', type: 'life' },
    'black-stars-jersey': { text: 'Black Stars', bg: '#FFFDE7', textColor: '#1A1A2E', face: '\u26BD', type: 'life' },
    'cedi-notes': { text: 'GH\u20B5 Notes', bg: '#E8F5E9', textColor: '#006B3F', face: '\uD83D\uDCB5', type: 'life' },
    'kente-pattern': { text: 'Kente', bg: '#D4A017', textColor: '#1A1A2E', face: '\uD83E\uDDE3', type: 'life' },
    'akwaaba': { text: 'Akwaaba', bg: '#006B3F', textColor: '#D4A017', face: '\uD83D\uDC4B', type: 'life' },
    'highlife-guitar': { text: 'Highlife Vibes', bg: '#D4A017', textColor: '#1A1A2E', face: '\uD83C\uDFB8', type: 'life' },
    'cedi-loading': { text: 'GH\u20B5 Loading...', bg: '#FFF3E0', textColor: '#CE1126', face: '\uD83D\uDCB8', type: 'life' },
    'chop-bar-open': { text: 'Chop Bar OPEN', bg: '#4E342E', textColor: '#D4A017', face: '\uD83C\uDF7D\uFE0F', type: 'life' },
    'black-stars': { text: 'Black Stars', bg: '#1A1A2E', textColor: '#D4A017', face: '\u2B50', type: 'life' },
    'dumsor-candle': { text: 'Dumsor', bg: '#263238', textColor: '#FFD54F', face: '\uD83D\uDD6F\uFE0F', type: 'life' },
    'friday-wear': { text: 'Friday Wear', bg: '#D4A017', textColor: '#1A1A2E', face: '\uD83D\uDC54', type: 'life' },
  },
};

function lookupMobileSticker(packId: string, stickerId: string): MobileStickerDef | null {
  return MOBILE_STICKER_MAP[packId]?.[stickerId] ?? null;
}

function buildStickerContent(event: any): HTMLElement | null {
  const info = event.content?.info;
  const packId = info?.packId;
  const stickerId = info?.stickerId;
  if (!packId || !stickerId) return null;

  const def = lookupMobileSticker(packId, stickerId);
  if (!def) return null;

  const size = 100; // mobile sticker size in chat

  if (def.type === 'adinkra' && def.svgPath) {
    // Adinkra: dark circle with gold SVG
    const container = h('div', {
      style: {
        width: `${size}px`, height: `${size}px`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '4px',
      },
    });

    const circle = h('div', {
      style: {
        width: `${size * 0.72}px`, height: `${size * 0.72}px`,
        borderRadius: '50%', background: '#1A1A2E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(212,160,23,0.2)',
        boxShadow: '0 4px 16px rgba(26,26,46,0.5)',
      },
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', `${size * 0.38}`);
    svg.setAttribute('height', `${size * 0.38}`);
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('fill', 'none');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', def.svgPath);
    path.setAttribute('stroke', '#D4A017');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    circle.appendChild(svg);

    const label = h('span', {
      style: {
        fontFamily: "'Inter', sans-serif", fontSize: '9px',
        fontWeight: '700', color: '#D4A017',
        textTransform: 'uppercase', letterSpacing: '0.04em',
        textAlign: 'center',
      },
    }, def.text);

    container.appendChild(circle);
    container.appendChild(label);
    return container;
  }

  // Expression or Life sticker: circle/rounded rect with text + emoji
  const isExpression = def.type === 'expression';
  const borderRadius = isExpression ? '50%' : '14px';
  const fontSize = def.fontSize || (isExpression ? 16 : 13);

  const container = h('div', {
    style: {
      width: `${size}px`, height: `${size}px`,
      borderRadius, background: def.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '2px', boxShadow: `0 3px 10px ${def.bg}44`,
      overflow: 'hidden', position: 'relative',
    },
  });

  // Decorative ring for expressions
  if (isExpression) {
    const ring = h('div', {
      style: {
        position: 'absolute', inset: '3px', borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.2)', pointerEvents: 'none',
      },
    });
    container.appendChild(ring);
  }

  const textEl = h('span', {
    style: {
      fontFamily: "'Inter', sans-serif",
      fontSize: `${fontSize}px`, fontWeight: '900',
      color: def.textColor, textAlign: 'center',
      lineHeight: '1.1', letterSpacing: '-0.02em',
      whiteSpace: 'pre-line', zIndex: '1',
      textShadow: def.textColor === '#fff' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
      padding: '0 6px',
    },
  }, def.text);

  container.appendChild(textEl);

  if (def.face) {
    const faceEl = h('span', {
      style: {
        fontSize: isExpression ? '22px' : '28px',
        lineHeight: '1', zIndex: '1',
        marginTop: isExpression ? '2px' : '2px',
      },
    }, def.face);
    container.appendChild(faceEl);
  }

  return container;
}

// ---------------------------------------------------------------------------
// Football Score Card
// ---------------------------------------------------------------------------

function buildFootballScoreContent(event: any, isOwn: boolean): HTMLElement {
  const c = event.content || {};
  const competition = c.competition || 'Match';
  const homeTeam = c.homeTeam || 'Home';
  const awayTeam = c.awayTeam || 'Away';
  const homeScore = c.homeScore ?? 0;
  const awayScore = c.awayScore ?? 0;
  const homeFlag = c.homeFlag || '\u26BD';
  const awayFlag = c.awayFlag || '\u26BD';
  const status = c.status || 'FT';
  const minute = c.minute || '';
  const events: { minute: string; event: string; team: string }[] = c.events || [];

  const statusColor = status === 'LIVE' ? '#22c55e'
    : status === 'HT' ? '#D4A017'
    : '#888';

  const card = h('div', {
    style: {
      background: isOwn ? 'rgba(0,0,0,0.2)' : '#1a1a2e',
      borderRadius: '14px',
      overflow: 'hidden',
      maxWidth: '280px',
      border: '1px solid rgba(255,255,255,0.08)',
    },
  });

  // Competition header
  card.appendChild(h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.02)',
    },
  },
    h('span', {
      style: {
        fontSize: '10px',
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'var(--font-body)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
    }, competition),
    h('span', {
      style: {
        fontSize: '9px',
        fontWeight: '700',
        padding: '2px 8px',
        borderRadius: '99px',
        background: `${statusColor}20`,
        color: statusColor,
      },
    }, status === 'LIVE' && minute ? `${minute}'` : status),
  ));

  // Score row
  const scoreRow = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
    },
  });

  // Home team
  scoreRow.appendChild(h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      flex: '1',
    },
  },
    h('span', { style: { fontSize: '22px' } }, homeFlag),
    h('span', {
      style: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#fff',
        fontFamily: 'var(--font-body)',
        textAlign: 'center',
        lineHeight: '1.2',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    }, homeTeam),
  ));

  // Score
  scoreRow.appendChild(h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  },
    h('span', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(26px, 7vw, 32px)',
        fontWeight: '900',
        color: '#fff',
        lineHeight: '1',
      },
    }, String(homeScore)),
    h('span', {
      style: {
        fontSize: '14px',
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '300',
      },
    }, '\u2013'),
    h('span', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(26px, 7vw, 32px)',
        fontWeight: '900',
        color: '#fff',
        lineHeight: '1',
      },
    }, String(awayScore)),
  ));

  // Away team
  scoreRow.appendChild(h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      flex: '1',
    },
  },
    h('span', { style: { fontSize: '22px' } }, awayFlag),
    h('span', {
      style: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#fff',
        fontFamily: 'var(--font-body)',
        textAlign: 'center',
        lineHeight: '1.2',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    }, awayTeam),
  ));

  card.appendChild(scoreRow);

  // Events
  if (events.length > 0) {
    const eventsContainer = h('div', {
      style: {
        padding: '0 12px 10px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '8px',
      },
    });

    for (const ev of events.slice(0, 5)) {
      eventsContainer.appendChild(h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '3px',
        },
      },
        h('span', {
          style: {
            fontSize: '9px',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'monospace',
            minWidth: '24px',
          },
        }, ev.minute),
        h('span', {
          style: {
            fontSize: '10px',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)',
          },
        }, ev.event),
      ));
    }

    card.appendChild(eventsContainer);
  }

  // Footer
  card.appendChild(h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '6px 12px',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      fontSize: '9px',
      color: 'rgba(255,255,255,0.3)',
    },
  }, '\u26BD Live Score Card'));

  return card;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function createMessageBubble(
  event: any,
  isOwnMessage: boolean,
  callbacks?: MessageCallbacks,
): HTMLElement {
  const msgtype = event.content?.msgtype || 'm.text';
  const ts = event.origin_server_ts || Date.now();

  const children: (string | Node)[] = [];

  // 1. Sender name (received messages in groups)
  if (!isOwnMessage && event.sender) {
    children.push(
      h('div', { className: 'bubble-sender-name' }, displayName(event.sender)),
    );
  }

  // 2. Reply preview
  const replyPreview = buildReplyPreview(event, isOwnMessage);
  if (replyPreview) {
    replyPreview.className = 'bubble-reply';
    // Add inner classes
    const senderEl = replyPreview.querySelector('div:first-child');
    const textEl = replyPreview.querySelector('div:last-child');
    if (senderEl) senderEl.className = 'bubble-reply-sender';
    if (textEl) textEl.className = 'bubble-reply-text';
    // Remove inline styles that conflict with CSS classes
    replyPreview.removeAttribute('style');
    if (senderEl) (senderEl as HTMLElement).removeAttribute('style');
    if (textEl) (textEl as HTMLElement).removeAttribute('style');
    children.push(replyPreview);
  }

  // 3. Message content by type
  if (msgtype === 'm.sticker') {
    const stickerEl = buildStickerContent(event);
    if (stickerEl) {
      children.push(stickerEl);
    } else {
      children.push(buildTextContent(event));
    }
  } else if (msgtype === 'm.momo.request') {
    children.push(buildMoMoRequestContent(event, isOwnMessage));
  } else if (msgtype === 'm.momo.receipt') {
    children.push(buildMoMoReceiptContent(event, isOwnMessage));
  } else if (msgtype === 'm.football.score') {
    children.push(buildFootballScoreContent(event, isOwnMessage));
  } else if (msgtype === 'm.poll' || parsePollData(event) !== null) {
    children.push(buildPollContent(event, isOwnMessage));
  } else if (msgtype === 'm.image') {
    children.push(buildImageContent(event));
  } else if (msgtype === 'm.file') {
    children.push(buildFileContent(event, isOwnMessage));
  } else if (msgtype === 'm.audio') {
    children.push(buildAudioContent(event, isOwnMessage));
  } else {
    children.push(buildTextContent(event));
  }

  // 4. Inline meta — time + receipt floated right (WhatsApp-style)
  const status = event._receiptStatus
    || (event.unsigned?.transaction_id ? 'sent' : 'delivered');
  let receiptIcon = '\u2713';
  let receiptClass = 'bubble-receipt bubble-receipt--sent';
  if (status === 'delivered') {
    receiptIcon = '\u2713\u2713';
    receiptClass = 'bubble-receipt bubble-receipt--delivered';
  } else if (status === 'read') {
    receiptIcon = '\u2713\u2713';
    receiptClass = 'bubble-receipt bubble-receipt--read';
  }

  const metaChildren: (string | Node)[] = [
    h('span', { className: 'bubble-time' }, formatTime(ts)),
  ];
  if (isOwnMessage) {
    metaChildren.push(h('span', { className: receiptClass }, receiptIcon));
  }
  children.push(h('span', { className: 'bubble-meta' }, ...metaChildren));

  // 5. Build the bubble element
  const isSticker = msgtype === 'm.sticker';
  const bubbleClass = isSticker
    ? (isOwnMessage ? 'bubble bubble--sent bubble--sticker' : 'bubble bubble--received bubble--sticker')
    : (isOwnMessage ? 'bubble bubble--sent' : 'bubble bubble--received');
  const bubble = h('div', {
    className: bubbleClass,
    'data-event-id': event.event_id || '',
  }, ...children);

  // Remove bubble background for stickers
  if (isSticker) {
    bubble.style.background = 'none';
    bubble.style.boxShadow = 'none';
    bubble.style.padding = '4px';
  }

  // 6. Wrapper
  const wrapperClass = isOwnMessage ? 'bubble-wrapper bubble-wrapper--sent' : 'bubble-wrapper bubble-wrapper--received';
  const wrapper = h('div', { className: wrapperClass }, bubble);

  // 7. Reactions display
  const reactionsEl = buildReactions(event, isOwnMessage, callbacks);
  if (reactionsEl) wrapper.appendChild(reactionsEl);

  // 8. Long-press for context menu (bottom sheet)
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  bubble.addEventListener('touchstart', () => {
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      if (navigator.vibrate) navigator.vibrate(10);
      showContextMenu(event, isOwnMessage, callbacks);
    }, 500);
  }, { passive: true });
  bubble.addEventListener('touchend', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }, { passive: true });
  bubble.addEventListener('touchmove', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }, { passive: true });

  // 9. Swipe-to-reply
  attachSwipeToReply(bubble, event, callbacks);

  return wrapper;
}
