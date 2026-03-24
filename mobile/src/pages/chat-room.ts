import { h, render } from '../utils/dom';
import {
  matrixGetMessages,
  matrixSendMessage,
  matrixSendCustomEvent,
  matrixSync,
  matrixSendReply,
  matrixAddReaction,
  matrixUploadMedia,
  matrixSendFile,
  matrixSendVoiceNote,
  matrixSendTyping,
  matrixSendReadReceipt,
  matrixGetRoomMembers,
  matrixGetAllRoomMembers,
  matrixRedact,
  matrixEditMessage,
  matrixSendPoll,
  MATRIX_BASE,
} from '../api';
import { createMessageBubble, isPollVoteEvent, recordPollVote } from '../components/message';
import { createChatInput, ChatInputElement } from '../components/chat-input';
import { createCallButtons } from '../components/call-button';
import { showCallView, setIncomingCallData } from '../components/call-view';
import { webRTCService } from '../services/webrtc';
import { offlineQueue } from '../services/offline-queue';

/* ------------------------------------------------------------------ */
/*  Inject typing indicator keyframes (once)                           */
/* ------------------------------------------------------------------ */

let typingStylesInjected = false;
function injectTypingStyles() {
  if (typingStylesInjected) return;
  typingStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes typing-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('os_mobile_credentials');
    if (raw) {
      const creds = JSON.parse(raw);
      return creds.userId || creds.user_id || '';
    }
  } catch { /* ignore */ }
  return '';
}

function getMatrixToken(): string | null {
  return localStorage.getItem('os_mobile_matrix_token');
}

function displayName(userId: string): string {
  return userId?.split(':')[0].replace('@', '') || 'Unknown';
}

/* ------------------------------------------------------------------ */
/*  Connection status                                                  */
/* ------------------------------------------------------------------ */

type ConnectionState = 'connected' | 'syncing' | 'error';

function connectionColor(state: ConnectionState): string {
  switch (state) {
    case 'connected': return '#22c55e';
    case 'syncing': return '#facc15';
    case 'error': return '#ef4444';
  }
}

/* ------------------------------------------------------------------ */
/*  Main page renderer                                                 */
/* ------------------------------------------------------------------ */

export function renderChatRoom(container: HTMLElement, params?: Record<string, string>): void {
  const roomId = params?.roomId ? decodeURIComponent(params.roomId) : '';
  if (!roomId) {
    container.innerHTML = '<p style="padding:24px;text-align:center;color:#888;font-family:var(--font-body)">Room not found</p>';
    return;
  }

  injectTypingStyles();

  const currentUserId = getCurrentUserId();
  let destroyed = false;
  let syncAbort: AbortController | null = null;
  let memberCount = 0;

  // Track last event id for read receipts
  let lastVisibleEventId: string | null = null;

  // Track reply context (sender + body) since ChatInputElement only exposes eventId
  let pendingReplySender: string | null = null;
  let pendingReplyBody: string | null = null;

  // Edit mode state
  let editingEventId: string | null = null;
  let editingOriginalBody: string | null = null;
  let editIndicatorEl: HTMLElement | null = null;

  // ================================================================
  //  Header
  // ================================================================

  // Avatar with initials
  const avatarInitial = roomId.charAt(1).toUpperCase();
  const connectionDot = h('div', {
    className: 'chat-header-avatar-dot',
    style: { background: connectionColor('syncing') },
  });

  const avatar = h('div', { className: 'chat-header-avatar' },
    h('span', {}, avatarInitial),
    connectionDot,
  );

  function setConnectionState(state: ConnectionState) {
    connectionDot.style.background = connectionColor(state);
  }

  const roomTitle = h('span', { className: 'chat-header-name' }, 'Loading\u2026');
  const memberLabel = h('span', { className: 'chat-header-status' });

  // Call buttons (phone + video) — hidden for guests
  const callButtons = createCallButtons(roomId, 'Loading\u2026');

  // Set up WebRTC credentials for incoming call detection
  const creds = JSON.parse(localStorage.getItem('os_mobile_credentials') || '{}');
  if (creds.accessToken && creds.userId) {
    webRTCService.setCredentials({ accessToken: creds.accessToken, userId: creds.userId });
  }

  // Listen for incoming calls while in this room
  const unsubIncoming = webRTCService.on('call:incoming', (data: any) => {
    setIncomingCallData(data);
    showCallView();
  });

  // ================================================================
  //  Chat Search State
  // ================================================================

  let searchOpen = false;
  let searchMatches: HTMLElement[] = [];
  let searchIndex = -1;

  const searchInput = h('input', {
    className: 'chat-search-input',
    type: 'text',
    placeholder: 'Search messages\u2026',
  }) as HTMLInputElement;

  const searchCount = h('span', { className: 'chat-search-count' }, '');

  const searchUpBtn = h('button', {
    onClick: () => navigateSearch(-1),
  }, '\u25B2');

  const searchDownBtn = h('button', {
    onClick: () => navigateSearch(1),
  }, '\u25BC');

  const searchCloseBtn = h('button', {
    onClick: () => closeSearch(),
    style: { fontSize: '16px' },
  }, '\u2715');

  const searchBar = h('div', {
    className: 'chat-search-bar',
    style: { display: 'none' },
  },
    searchInput,
    searchCount,
    h('div', { className: 'chat-search-nav' }, searchUpBtn, searchDownBtn),
    searchCloseBtn,
  );

  searchInput.addEventListener('input', () => {
    performSearch(searchInput.value.trim());
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'Enter') navigateSearch(e.shiftKey ? -1 : 1);
  });

  function performSearch(query: string) {
    // Clear previous highlights
    for (const m of searchMatches) {
      m.classList.remove('message-highlight');
      m.style.outline = '';
    }
    searchMatches = [];
    searchIndex = -1;

    if (!query) {
      searchCount.textContent = '';
      return;
    }

    const lowerQuery = query.toLowerCase();
    const bubbles = messagesArea.querySelectorAll('[data-event-id]');
    bubbles.forEach((bubble) => {
      const text = (bubble as HTMLElement).textContent?.toLowerCase() || '';
      if (text.includes(lowerQuery)) {
        searchMatches.push(bubble as HTMLElement);
      }
    });

    if (searchMatches.length > 0) {
      searchIndex = 0;
      highlightCurrentMatch();
      searchCount.textContent = `1 of ${searchMatches.length}`;
    } else {
      searchCount.textContent = '0 matches';
    }
  }

  function navigateSearch(direction: number) {
    if (searchMatches.length === 0) return;
    // Remove outline from current
    if (searchIndex >= 0 && searchIndex < searchMatches.length) {
      searchMatches[searchIndex].style.outline = '';
    }
    searchIndex += direction;
    if (searchIndex >= searchMatches.length) searchIndex = 0;
    if (searchIndex < 0) searchIndex = searchMatches.length - 1;
    highlightCurrentMatch();
    searchCount.textContent = `${searchIndex + 1} of ${searchMatches.length}`;
  }

  function highlightCurrentMatch() {
    if (searchIndex < 0 || searchIndex >= searchMatches.length) return;
    const el = searchMatches[searchIndex];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('message-highlight');
    // Force reflow to re-trigger animation
    void el.offsetWidth;
    el.classList.add('message-highlight');
    el.style.outline = '1px solid rgba(212,160,23,0.5)';
    el.style.borderRadius = '8px';
  }

  function openSearch() {
    searchOpen = true;
    searchBar.style.display = 'flex';
    searchInput.value = '';
    searchCount.textContent = '';
    searchInput.focus();
  }

  function closeSearch() {
    searchOpen = false;
    searchBar.style.display = 'none';
    searchInput.value = '';
    for (const m of searchMatches) {
      m.classList.remove('message-highlight');
      m.style.outline = '';
    }
    searchMatches = [];
    searchIndex = -1;
    searchCount.textContent = '';
  }

  const searchBtn = h('button', {
    style: {
      background: 'none',
      border: 'none',
      fontSize: '18px',
      padding: '8px',
      cursor: 'pointer',
      color: 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '36px',
      minHeight: '36px',
    },
    onClick: () => {
      if (searchOpen) closeSearch();
      else openSearch();
    },
  }, '\uD83D\uDD0D');

  const header = h('header', { className: 'chat-header' },
    h('button', {
      className: 'chat-back-btn',
      onClick: () => {
        destroyed = true;
        if (syncAbort) syncAbort.abort();
        matrixSendTyping(roomId, false).catch(() => {});
        unsubIncoming();
        history.back();
      },
    }, '\u2190'),
    avatar,
    h('div', { className: 'chat-header-info' }, roomTitle, memberLabel),
    searchBtn,
    callButtons,
  );

  // ================================================================
  //  Messages area
  // ================================================================

  const messagesArea = h('div', {
    className: 'chat-room-messages',
  });

  const loadingIndicator = h('div', {
    style: {
      textAlign: 'center',
      padding: '32px',
      color: '#7a7060',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(13px, 3.4vw, 14px)',
    },
  }, 'Loading messages\u2026');
  messagesArea.appendChild(loadingIndicator);

  const bottomSpacer = h('div', {
    style: { height: '60px', flexShrink: '0' },
  });
  messagesArea.appendChild(bottomSpacer);

  // ================================================================
  //  Typing indicator (Ghana-colored bouncing dots)
  // ================================================================

  const typingDots = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      marginLeft: '4px',
    },
  },
    ...(['#CE1126', '#FCD116', '#006B3F'].map((color, i) =>
      h('span', {
        style: {
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          animation: `typing-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
        },
      })
    ))
  );

  const typingText = h('span', {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(11px, 2.8vw, 12px)',
      color: '#999',
      marginLeft: '6px',
    },
  });

  const typingIndicator = h('div', {
    className: 'typing-indicator',
    style: {
      display: 'none',
      alignItems: 'center',
      padding: '4px 12px 8px',
      gap: '2px',
    },
  }, typingDots, typingText);

  let typingClearTimer: ReturnType<typeof setTimeout> | null = null;

  function showTyping(userIds: string[]) {
    const others = userIds.filter(id => id !== currentUserId);
    if (others.length === 0) {
      typingIndicator.style.display = 'none';
      return;
    }

    const names = others.map(displayName);
    let text: string;
    if (names.length === 1) {
      text = `${names[0]} is typing\u2026`;
    } else if (names.length === 2) {
      text = `${names[0]} and ${names[1]} are typing\u2026`;
    } else {
      text = `${names[0]} and ${names.length - 1} others are typing\u2026`;
    }

    typingText.textContent = text;
    typingIndicator.style.display = 'flex';

    // Auto-clear after 6s in case we miss the stop event
    if (typingClearTimer) clearTimeout(typingClearTimer);
    typingClearTimer = setTimeout(() => {
      typingIndicator.style.display = 'none';
    }, 6000);
  }

  // ================================================================
  //  Input bar (full callbacks)
  // ================================================================

  const inputBar: ChatInputElement = createChatInput({
    onSend: (text) => sendMessage(text),
    onSendFile: (file) => handleFileSend(file),
    onSendVoice: (blob, duration, waveform) => handleVoiceSend(blob, duration, waveform),
    onSendSticker: (packId, stickerId, altText) => handleSendSticker(packId, stickerId, altText),
    onTyping: () => handleTyping(),
    roomId,
  });

  // ================================================================
  //  Scroll-to-bottom FAB
  // ================================================================

  const scrollFab = h('button', {
    className: 'scroll-to-bottom-fab',
    onClick: () => {
      bottomSpacer.scrollIntoView({ behavior: 'smooth' });
    },
  }, '\u2193');

  messagesArea.addEventListener('scroll', () => {
    const distFromBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;
    if (distFromBottom > 200) {
      scrollFab.classList.add('scroll-to-bottom-fab--visible');
    } else {
      scrollFab.classList.remove('scroll-to-bottom-fab--visible');
    }
  });

  // ================================================================
  //  Layout wrapper
  // ================================================================

  const wrapper = h('div', {
    className: 'chat-room-bg',
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - 56px - 56px)',
      position: 'relative',
    },
  }, messagesArea, typingIndicator, scrollFab);

  // ================================================================
  //  Poll creation panel
  // ================================================================

  let pollPanelEl: HTMLElement | null = null;

  function showPollCreator() {
    if (pollPanelEl) { pollPanelEl.remove(); pollPanelEl = null; return; }

    const panel = h('div', {
      style: {
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '12px',
        animation: 'pollSlideUp 0.2s ease-out',
      },
    });

    // Inject animation
    if (!document.getElementById('poll-anim-style')) {
      const s = document.createElement('style');
      s.id = 'poll-anim-style';
      s.textContent = `@keyframes pollSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
      document.head.appendChild(s);
    }

    // Header
    panel.appendChild(h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      },
    },
      h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '6px' },
      },
        h('span', { style: { fontSize: '14px' } }, '\u{1F4CA}'),
        h('span', {
          style: {
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--gold)',
            fontFamily: 'var(--font-display)',
          },
        }, 'Create Poll'),
      ),
      h('button', {
        style: {
          background: 'none',
          border: 'none',
          color: '#999',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: '1',
        },
        onClick: () => { panel.remove(); pollPanelEl = null; },
      }, '\u2715'),
    ));

    // Question input
    const qInput = document.createElement('input');
    qInput.type = 'text';
    qInput.placeholder = 'Ask a question...';
    qInput.maxLength = 200;
    Object.assign(qInput.style, {
      width: '100%',
      padding: '8px 10px',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text)',
      fontSize: '13px',
      fontFamily: 'var(--font-body)',
      outline: 'none',
      marginBottom: '8px',
      boxSizing: 'border-box',
    });
    qInput.addEventListener('focus', () => { qInput.style.borderColor = 'var(--gold)'; });
    qInput.addEventListener('blur', () => { qInput.style.borderColor = 'var(--border)'; });
    panel.appendChild(qInput);

    // Option inputs
    const optionInputs: HTMLInputElement[] = [];
    const optionsContainer = h('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' },
    });

    function createOptionInput(idx: number): HTMLElement {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Option ${idx + 1}`;
      input.maxLength = 100;
      Object.assign(input.style, {
        flex: '1',
        padding: '6px 10px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.04)',
        color: 'var(--text)',
        fontSize: '12px',
        fontFamily: 'var(--font-body)',
        outline: 'none',
        boxSizing: 'border-box',
      });
      input.addEventListener('focus', () => { input.style.borderColor = 'var(--gold)'; });
      input.addEventListener('blur', () => { input.style.borderColor = 'var(--border)'; });
      optionInputs.push(input);

      const row = h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '6px' },
      },
        h('span', {
          style: {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: '700',
            background: 'rgba(212,160,23,0.12)',
            color: 'var(--gold)',
            flexShrink: '0',
          },
        }, String.fromCharCode(65 + idx)),
        input,
      );

      return row;
    }

    // Start with 2 options
    optionsContainer.appendChild(createOptionInput(0));
    optionsContainer.appendChild(createOptionInput(1));
    panel.appendChild(optionsContainer);

    // Add option button
    const addOptBtn = h('button', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        color: 'var(--gold)',
        fontSize: '11px',
        fontWeight: '600',
        cursor: 'pointer',
        padding: '4px 0',
        marginBottom: '10px',
        fontFamily: 'var(--font-body)',
      },
      onClick: () => {
        if (optionInputs.length < 4) {
          optionsContainer.appendChild(createOptionInput(optionInputs.length));
        }
        if (optionInputs.length >= 4) {
          addOptBtn.style.display = 'none';
        }
      },
    }, '+ Add option');
    panel.appendChild(addOptBtn);

    // Send button
    const sendBtn = h('button', {
      style: {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        background: '#006B3F',
        color: '#fff',
        border: 'none',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      },
      onClick: async () => {
        const question = qInput.value.trim();
        const options = optionInputs
          .map(i => i.value.trim())
          .filter(v => v.length > 0);

        if (!question || options.length < 2) return;

        sendBtn.textContent = 'Sending...';
        (sendBtn as HTMLButtonElement).disabled = true;

        try {
          await matrixSendPoll(roomId, question, options);
        } catch (err) {
          console.warn('[ChatRoom] Failed to send poll:', err);
        }

        panel.remove();
        pollPanelEl = null;
      },
    }, '\u{1F4E8} Send Poll');
    panel.appendChild(sendBtn);

    pollPanelEl = panel;
    // Insert before input bar
    inputBar.parentElement?.insertBefore(panel, inputBar);

    // Focus the question input
    requestAnimationFrame(() => qInput.focus());
  }

  // Add poll + football buttons to the chat input toolbar
  const capsule = inputBar.querySelector('.chat-input-field-wrap') as HTMLElement | null;
  if (capsule) {
    const pollBtn = h('button', {
      className: 'chat-input-attach',
      style: {
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '18px',
        cursor: 'pointer',
        padding: '0',
        minWidth: '36px',
        minHeight: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: '0',
      },
      onClick: () => showPollCreator(),
    }, '\u{1F4CA}');

    const footballBtn = h('button', {
      className: 'chat-input-attach',
      style: {
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '18px',
        cursor: 'pointer',
        padding: '0',
        minWidth: '36px',
        minHeight: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: '0',
      },
      onClick: () => showFootballPanel(),
    }, '\u26BD');

    // Insert before the last child (attach button) in the capsule
    const attachBtnEl = capsule.querySelector('.chat-input-attach');
    if (attachBtnEl) {
      capsule.insertBefore(pollBtn, attachBtnEl);
      capsule.insertBefore(footballBtn, attachBtnEl);
    } else {
      capsule.appendChild(pollBtn);
      capsule.appendChild(footballBtn);
    }
  }

  // ================================================================
  //  Football panel
  // ================================================================

  let footballPanelEl: HTMLElement | null = null;

  function showFootballPanel() {
    if (footballPanelEl) { footballPanelEl.remove(); footballPanelEl = null; return; }

    const panel = h('div', {
      style: {
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '12px',
        maxHeight: '320px',
        overflowY: 'auto',
        animation: 'pollSlideUp 0.2s ease-out',
      },
    });

    // Header
    panel.appendChild(h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      },
    },
      h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '6px' },
      },
        h('span', { style: { fontSize: '14px' } }, '\u26BD'),
        h('span', {
          style: {
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--gold)',
            fontFamily: 'var(--font-display)',
          },
        }, 'Live Scores'),
      ),
      h('button', {
        style: {
          background: 'none',
          border: 'none',
          color: '#999',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: '1',
        },
        onClick: () => { panel.remove(); footballPanelEl = null; },
      }, '\u2715'),
    ));

    // Loading state
    const loadingEl = h('div', {
      style: {
        textAlign: 'center',
        padding: '24px',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
      },
    }, 'Fetching matches...');
    panel.appendChild(loadingEl);

    footballPanelEl = panel;
    inputBar.parentElement?.insertBefore(panel, inputBar);

    // Fetch matches
    fetchFootballMatches(panel, loadingEl);
  }

  async function fetchFootballMatches(panel: HTMLElement, loadingEl: HTMLElement) {
    try {
      const res = await fetch('https://os-browser-worker.ghwmelite.workers.dev/api/v1/govchat/football/live');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const matches: any[] = data.matches || data.data || [];

      loadingEl.remove();

      if (matches.length === 0) {
        panel.appendChild(h('div', {
          style: {
            textAlign: 'center',
            padding: '24px',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
          },
        },
          h('div', { style: { fontSize: '24px', marginBottom: '8px' } }, '\u26BD'),
          'No live matches right now',
        ));
        return;
      }

      const matchList = h('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '8px' },
      });

      for (const match of matches.slice(0, 10)) {
        const homeTeam = match.homeTeam?.name || match.home || 'Home';
        const awayTeam = match.awayTeam?.name || match.away || 'Away';
        const homeScore = match.score?.home ?? match.homeScore ?? 0;
        const awayScore = match.score?.away ?? match.awayScore ?? 0;
        const competition = match.competition?.name || match.league || 'Match';
        const status = match.status || 'FT';
        const minute = match.minute || '';
        const homeFlag = match.homeTeam?.flag || match.homeFlag || '\uD83C\uDFF3\uFE0F';
        const awayFlag = match.awayTeam?.flag || match.awayFlag || '\uD83C\uDFF3\uFE0F';
        const events = match.events || [];

        const statusColor = status === 'LIVE' ? '#22c55e' : status === 'HT' ? '#D4A017' : '#888';

        const matchCard = h('button', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            color: 'inherit',
            transition: 'background 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          },
          onClick: async () => {
            // Send as score card
            const content = JSON.stringify({
              msgtype: 'm.football.score',
              body: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
              competition,
              homeTeam,
              awayTeam,
              homeScore,
              awayScore,
              homeFlag,
              awayFlag,
              status,
              minute,
              events: events.slice(0, 5),
            });

            // Use the onSend path which handles custom JSON
            const textarea = inputBar.querySelector('textarea') as HTMLTextAreaElement | null;
            if (textarea) {
              textarea.value = content;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              // Trigger send
              const sendBtnEl = inputBar.querySelector('.chat-input-send') as HTMLButtonElement | null;
              if (sendBtnEl) sendBtnEl.click();
              else {
                // Fallback: dispatch enter
                textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              }
            }

            panel.remove();
            footballPanelEl = null;
          },
        },
          // Home
          h('div', {
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '1', minWidth: '0' },
          },
            h('span', { style: { fontSize: '16px' } }, homeFlag),
            h('span', {
              style: {
                fontSize: '10px', fontWeight: '600', color: '#fff',
                fontFamily: 'var(--font-body)', textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70px',
              },
            }, homeTeam),
          ),
          // Score
          h('div', {
            style: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: '0' },
          },
            h('span', {
              style: { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '900', color: '#fff' },
            }, String(homeScore)),
            h('span', { style: { fontSize: '10px', color: 'rgba(255,255,255,0.3)' } }, '-'),
            h('span', {
              style: { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '900', color: '#fff' },
            }, String(awayScore)),
          ),
          // Away
          h('div', {
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '1', minWidth: '0' },
          },
            h('span', { style: { fontSize: '16px' } }, awayFlag),
            h('span', {
              style: {
                fontSize: '10px', fontWeight: '600', color: '#fff',
                fontFamily: 'var(--font-body)', textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70px',
              },
            }, awayTeam),
          ),
          // Status badge
          h('span', {
            style: {
              fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '99px',
              background: `${statusColor}20`, color: statusColor, flexShrink: '0',
            },
          }, status === 'LIVE' && minute ? `${minute}'` : status),
        );

        matchCard.addEventListener('pointerenter', () => { matchCard.style.background = 'rgba(255,255,255,0.06)'; });
        matchCard.addEventListener('pointerleave', () => { matchCard.style.background = 'rgba(255,255,255,0.02)'; });

        matchList.appendChild(matchCard);
      }

      panel.appendChild(matchList);
    } catch (err) {
      loadingEl.textContent = 'Failed to load matches';
      loadingEl.style.color = '#CE1126';
    }
  }

  render(container, header, searchBar, wrapper, inputBar);

  // ================================================================
  //  Scroll helper
  // ================================================================

  function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      bottomSpacer.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    });
  }

  // ================================================================
  //  Message rendering (dedup + reaction tracking)
  // ================================================================

  const renderedEventIds = new Set<string>();
  const reactionsByEvent = new Map<string, Map<string, number>>();

  function appendMessage(event: any) {
    const eventId = event.event_id || `local-${event.origin_server_ts}`;
    if (renderedEventIds.has(eventId)) return;

    // Ensure room_id is set for poll voting
    if (!event.room_id) event.room_id = roomId;

    // Record poll votes and skip rendering them as messages
    if (isPollVoteEvent(event)) {
      recordPollVote(event);
      renderedEventIds.add(eventId);
      return;
    }

    renderedEventIds.add(eventId);

    const isOwn = event.sender === currentUserId;
    const bubble = createMessageBubble(event, isOwn, {
      onReply: (ev) => {
        const sender = ev.sender || '';
        const body = ev.content?.body || '';
        const id = ev.event_id || '';
        // Store reply context for sendMessage
        pendingReplySender = sender;
        pendingReplyBody = body;
        inputBar.setReply(displayName(sender), body, id);
      },
      onReaction: (evId, emoji) => {
        matrixAddReaction(roomId, evId, emoji).catch(() => {});
      },
      onDelete: (ev) => {
        const evId = ev.event_id;
        if (!evId) return;
        matrixRedact(roomId, evId).then(() => {
          const bubbleEl = messagesArea.querySelector(`[data-event-id="${evId}"]`);
          if (bubbleEl?.parentElement) bubbleEl.parentElement.remove();
          renderedEventIds.delete(evId);
        }).catch(() => {});
      },
      onEdit: (ev) => {
        const evId = ev.event_id;
        // Get the original body (strip edit fallback prefix "* ")
        let body = ev.content?.body || '';
        if (body.startsWith('* ')) body = body.slice(2);
        // Also strip reply fallback lines
        if (ev.content?.['m.relates_to']?.['m.in_reply_to'] && body.includes('\n')) {
          const lines = body.split('\n');
          let start = 0;
          while (start < lines.length && lines[start].startsWith('> ')) start++;
          if (start < lines.length && lines[start].trim() === '') start++;
          body = lines.slice(start).join('\n');
        }

        editingEventId = evId;
        editingOriginalBody = body;

        // Set the text in the input textarea
        const textarea = inputBar.querySelector('textarea');
        if (textarea) {
          (textarea as HTMLTextAreaElement).value = body;
          (textarea as HTMLTextAreaElement).focus();
          // Trigger input event to auto-resize if needed
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Show editing indicator bar
        showEditIndicator(body);
      },
      onForward: (_ev) => {
        // Forward action already copies via context menu; nothing extra needed here
      },
    });
    messagesArea.insertBefore(bubble, bottomSpacer);

    // Track last event for read receipts
    if (!eventId.startsWith('local-')) {
      lastVisibleEventId = eventId;
    }
  }

  function updateReactionOnBubble(targetEventId: string, emoji: string) {
    if (!reactionsByEvent.has(targetEventId)) {
      reactionsByEvent.set(targetEventId, new Map());
    }
    const emojiMap = reactionsByEvent.get(targetEventId)!;
    emojiMap.set(emoji, (emojiMap.get(emoji) || 0) + 1);

    const bubbleEl = messagesArea.querySelector(`[data-event-id="${targetEventId}"]`);
    const bubbleWrapper = bubbleEl?.parentElement;
    if (!bubbleWrapper) return;

    let reactContainer = bubbleWrapper.querySelector('.reaction-pills') as HTMLElement | null;
    if (!reactContainer) {
      reactContainer = h('div', {
        className: 'reaction-pills',
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginTop: '4px',
        },
      });
      bubbleWrapper.appendChild(reactContainer);
    }

    let pill = reactContainer.querySelector(`[data-emoji="${emoji}"]`) as HTMLElement | null;
    if (pill) {
      const countEl = pill.querySelector('.react-count');
      if (countEl) {
        const count = emojiMap.get(emoji) || 1;
        countEl.textContent = count > 1 ? String(count) : '';
      }
    } else {
      const count = emojiMap.get(emoji) || 1;
      pill = h('button', {
        'data-emoji': emoji,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 7px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.05)',
          color: '#e0e0e0',
          fontSize: '13px',
          cursor: 'pointer',
          minHeight: '26px',
          lineHeight: '1',
          fontFamily: 'var(--font-body)',
        },
        onClick: () => {
          matrixAddReaction(roomId, targetEventId, emoji).catch(() => {});
        },
      },
        h('span', {}, emoji),
        h('span', { className: 'react-count', style: { fontSize: '11px' } }, count > 1 ? String(count) : ''),
      );
      reactContainer.appendChild(pill);
    }
  }

  // ================================================================
  //  Edit mode UI helpers
  // ================================================================

  function showEditIndicator(previewText: string) {
    clearEditIndicator();
    editIndicatorEl = h('div', {
      className: 'edit-indicator-bar',
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#1a1a1a',
        borderLeft: '3px solid #D4A017',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      },
    },
      h('span', {
        style: {
          fontSize: '12px',
          fontWeight: '600',
          color: '#D4A017',
          fontFamily: 'var(--font-display)',
          flexShrink: '0',
        },
      }, 'Editing'),
      h('span', {
        style: {
          flex: '1',
          fontSize: '13px',
          color: '#999',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, previewText.length > 60 ? previewText.slice(0, 60) + '\u2026' : previewText),
      h('button', {
        style: {
          background: 'none',
          border: 'none',
          color: '#999',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: '1',
          flexShrink: '0',
        },
        onClick: () => clearEditState(),
      }, '\u2715'),
    );
    // Insert before the input bar
    inputBar.parentElement?.insertBefore(editIndicatorEl, inputBar);
  }

  function clearEditIndicator() {
    if (editIndicatorEl) {
      editIndicatorEl.remove();
      editIndicatorEl = null;
    }
  }

  function clearEditState() {
    editingEventId = null;
    editingOriginalBody = null;
    clearEditIndicator();
    const textarea = inputBar.querySelector('textarea');
    if (textarea) {
      (textarea as HTMLTextAreaElement).value = '';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ================================================================
  //  Send message (with reply + edit support)
  // ================================================================

  async function sendMessage(text: string) {
    // --- MoMo custom events: intercept JSON payloads from MoMo panel ---
    try {
      const parsed = JSON.parse(text);
      if (parsed.msgtype === 'm.momo.request' || parsed.msgtype === 'm.momo.receipt') {
        const tempId = `local-momo-${Date.now()}`;
        const optimisticEvent: any = {
          event_id: tempId,
          type: 'm.room.message',
          sender: currentUserId,
          content: parsed,
          origin_server_ts: Date.now(),
        };
        appendMessage(optimisticEvent);
        scrollToBottom();
        try {
          const result = await matrixSendCustomEvent(roomId, parsed);
          if (result) renderedEventIds.add(result);
        } catch (err) {
          console.warn('[chat-room] MoMo send failed:', err);
        }
        return;
      }
    } catch {
      // Not JSON — continue with normal text send
    }

    // --- Edit mode: update existing message ---
    if (editingEventId) {
      const evId = editingEventId;
      clearEditState();
      try {
        await matrixEditMessage(roomId, evId, text);
        // Update the bubble text in-place
        const bubbleEl = messagesArea.querySelector(`[data-event-id="${evId}"]`) as HTMLElement | null;
        if (bubbleEl) {
          // Find the text content div (has word-break: break-word style)
          const textDiv = bubbleEl.querySelector('div[style*="word-break"]') as HTMLElement | null;
          if (textDiv) {
            textDiv.textContent = text;
          }
        }
      } catch {
        // Silently fail — message stays as-is
      }
      return;
    }

    const replyToId = inputBar.getReplyEventId();
    const replySender = pendingReplySender;
    const replyBody = pendingReplyBody;
    const tempId = `local-${Date.now()}`;

    // --- Offline: queue and show optimistically with clock icon ---
    if (!navigator.onLine) {
      offlineQueue.enqueue({ roomId, body: text, type: 'text' });

      const optimisticEvent: any = {
        event_id: tempId,
        type: 'm.room.message',
        sender: currentUserId,
        content: { msgtype: 'm.text', body: text },
        origin_server_ts: Date.now(),
        _offline: true,
      };

      appendMessage(optimisticEvent);
      scrollToBottom();

      // Show clock icon on the bubble to indicate queued
      const el = messagesArea.querySelector(`[data-event-id="${tempId}"]`) as HTMLElement | null;
      if (el) {
        const clockIcon = h('span', {
          style: {
            fontSize: '10px',
            color: '#D4A017',
            marginLeft: '4px',
          },
        }, '\u{1F551}');
        el.appendChild(clockIcon);
      }

      // Clear reply state
      if (replyToId) {
        inputBar.clearReply();
        pendingReplySender = null;
        pendingReplyBody = null;
      }
      matrixSendTyping(roomId, false).catch(() => {});
      return;
    }

    const optimisticEvent: any = {
      event_id: tempId,
      type: 'm.room.message',
      sender: currentUserId,
      content: { msgtype: 'm.text', body: text },
      origin_server_ts: Date.now(),
    };

    // If replying, add relates_to so the reply preview renders
    if (replyToId && replySender && replyBody) {
      optimisticEvent.content['m.relates_to'] = {
        'm.in_reply_to': { event_id: replyToId },
      };
      optimisticEvent.content.body = `> <${replySender}> ${replyBody}\n\n${text}`;
    }

    appendMessage(optimisticEvent);
    scrollToBottom();

    // Clear reply state
    if (replyToId) {
      inputBar.clearReply();
      pendingReplySender = null;
      pendingReplyBody = null;
    }

    // Stop typing indicator
    matrixSendTyping(roomId, false).catch(() => {});

    try {
      let result: any;
      if (replyToId && replySender && replyBody) {
        result = await matrixSendReply(roomId, text, replyToId, replySender, replyBody);
      } else {
        result = await matrixSendMessage(roomId, text);
      }

      // Register the server-assigned event_id so the sync loop won't duplicate it
      if (result?.event_id) {
        renderedEventIds.add(result.event_id);
      }

      const el = messagesArea.querySelector(`[data-event-id="${tempId}"]`);
      if (el) el.removeAttribute('data-pending');
    } catch (err: any) {
      const el = messagesArea.querySelector(`[data-event-id="${tempId}"]`) as HTMLElement | null;
      if (el) {
        el.setAttribute('data-failed', 'true');
        el.style.opacity = '0.5';

        const retry = h('button', {
          onClick: async () => {
            el.style.opacity = '1';
            retry.remove();
            try {
              await matrixSendMessage(roomId, text);
            } catch { /* keep visible */ }
          },
          style: {
            background: 'none',
            border: 'none',
            color: '#CE1126',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 0',
            marginTop: '2px',
            fontFamily: 'var(--font-body)',
          },
        }, '\u21BB Retry');
        el.appendChild(retry);
      }
    }
  }

  // ================================================================
  //  File upload handler
  // ================================================================

  async function handleFileSend(file: File) {
    const tempId = `local-file-${Date.now()}`;
    const msgtype = file.type.startsWith('image/') ? 'm.image' : 'm.file';

    // Optimistic preview
    const optimisticEvent: any = {
      event_id: tempId,
      type: 'm.room.message',
      sender: currentUserId,
      content: {
        msgtype,
        body: file.name,
        info: { mimetype: file.type, size: file.size },
      },
      origin_server_ts: Date.now(),
    };

    // For images, create a local blob URL for instant preview
    if (msgtype === 'm.image') {
      optimisticEvent.content.url = URL.createObjectURL(file);
    }

    appendMessage(optimisticEvent);
    scrollToBottom();

    try {
      const contentUri = await matrixUploadMedia(file, file.name);
      const result = await matrixSendFile(roomId, contentUri, file.name, file.type, file.size);

      if (result) renderedEventIds.add(result);

      const el = messagesArea.querySelector(`[data-event-id="${tempId}"]`);
      if (el) el.removeAttribute('data-pending');
    } catch {
      const el = messagesArea.querySelector(`[data-event-id="${tempId}"]`) as HTMLElement | null;
      if (el) {
        el.style.opacity = '0.5';
        el.setAttribute('data-failed', 'true');
      }
    }
  }

  // ================================================================
  //  Voice note handler
  // ================================================================

  async function handleVoiceSend(blob: Blob, duration: number, waveform: number[]) {
    const tempId = `local-voice-${Date.now()}`;

    const optimisticEvent: any = {
      event_id: tempId,
      type: 'm.room.message',
      sender: currentUserId,
      content: {
        msgtype: 'm.audio',
        body: 'Voice message',
        url: URL.createObjectURL(blob),
        info: { duration: duration * 1000, mimetype: 'audio/webm' },
        'org.matrix.msc3245.voice': {},
        'org.matrix.msc1767.audio': { duration: duration * 1000, waveform },
      },
      origin_server_ts: Date.now(),
    };

    appendMessage(optimisticEvent);
    scrollToBottom();

    try {
      const contentUri = await matrixUploadMedia(blob, 'voice-message.ogg');
      const result = await matrixSendVoiceNote(roomId, contentUri, duration, waveform, blob.type || 'audio/webm', blob.size);

      if (result) renderedEventIds.add(result);

      const el = messagesArea.querySelector(`[data-event-id="${tempId}"]`);
      if (el) el.removeAttribute('data-pending');
    } catch {
      const el = messagesArea.querySelector(`[data-event-id="${tempId}"]`) as HTMLElement | null;
      if (el) {
        el.style.opacity = '0.5';
        el.setAttribute('data-failed', 'true');
      }
    }
  }

  // ================================================================
  //  Typing handler
  // ================================================================

  async function handleSendSticker(packId: string, stickerId: string, altText: string) {
    // Create optimistic local sticker bubble
    const tempId = `local-sticker-${Date.now()}`;
    const currentUserId = getCurrentUserId();
    const stickerEvent = {
      event_id: tempId,
      sender: currentUserId,
      origin_server_ts: Date.now(),
      type: 'm.room.message',
      content: {
        msgtype: 'm.sticker',
        body: altText,
        info: { packId, stickerId, w: 160, h: 160 },
      },
    };

    const bubble = createMessageBubble(stickerEvent, true);
    messagesArea.insertBefore(bubble, bottomSpacer);
    bottomSpacer.scrollIntoView({ behavior: 'smooth' });

    // Send via Matrix
    try {
      const result = await matrixSendCustomEvent(roomId, {
        msgtype: 'm.sticker',
        body: altText,
        info: { packId, stickerId, w: 160, h: 160 },
      });
      if (result?.event_id) {
        renderedEventIds.add(result.event_id);
      }
    } catch (err) {
      console.warn('[ChatRoom] sendSticker failed:', err);
    }
  }

  function handleTyping() {
    matrixSendTyping(roomId, true).catch(() => {});
  }

  // ================================================================
  //  Read receipt helper
  // ================================================================

  function sendReadReceiptForLatest() {
    if (lastVisibleEventId) {
      matrixSendReadReceipt(roomId, lastVisibleEventId).catch(() => {});
    }
  }

  // ================================================================
  //  Load initial data
  // ================================================================

  loadInitialData();

  async function loadInitialData() {
    try {
      const msgData = await matrixGetMessages(roomId, 50);
      const events = (msgData?.chunk || [])
        .filter((ev: any) => ev.type === 'm.room.message')
        .reverse();

      // Extract room name from state
      let roomName = roomId.split(':')[0].replace('!', '');
      const stateEvents = msgData?.state || [];
      for (const ev of stateEvents) {
        if (ev.type === 'm.room.name' && ev.content?.name) {
          roomName = ev.content.name;
        }
      }

      // Count joined members from state events
      const members = stateEvents.filter((ev: any) =>
        ev.type === 'm.room.member' && ev.content?.membership === 'join'
      );
      memberCount = members.length;

      // Try sync for better room name and member count
      try {
        setConnectionState('syncing');
        const syncData = await matrixSync();
        const joinedRoom = syncData?.rooms?.join?.[roomId];
        if (joinedRoom) {
          const stEvents = joinedRoom?.state?.events || [];
          for (const ev of stEvents) {
            if (ev.type === 'm.room.name' && ev.content?.name) {
              roomName = ev.content.name;
            }
          }
          const summary = joinedRoom?.summary;
          if (summary?.['m.joined_member_count']) {
            memberCount = summary['m.joined_member_count'];
          }
        }
      } catch { /* sync for name is optional */ }

      // If room name is still a raw ID, resolve from members
      if (!roomName || roomName === roomId.split(':')[0].replace('!', '') || roomName.startsWith('!')) {
        try {
          const members = await matrixGetRoomMembers(roomId);
          memberCount = members.length;
          let others = members.filter((m: any) => m.userId !== currentUserId);

          // If no other joined members, fetch ALL members (including invited/left)
          if (others.length === 0) {
            const allMembers = await matrixGetAllRoomMembers(roomId);
            others = allMembers.filter((m: any) => m.userId !== currentUserId);
          }

          if (others.length > 0) {
            roomName = others
              .map((m: any) => m.displayName || m.userId?.split(':')[0]?.replace('@', '') || 'Unknown')
              .join(', ');
          }
        } catch { /* keep existing name */ }
      }

      roomTitle.textContent = roomName;
      // Update call buttons with resolved room name
      callButtons.dataset.peerName = roomName;
      // Update avatar initial from resolved room name
      const initial = roomName.charAt(0).toUpperCase();
      const avatarSpan = avatar.querySelector('span');
      if (avatarSpan) avatarSpan.textContent = initial;

      if (memberCount > 0) {
        memberLabel.textContent = `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
      }

      // Clear loading and render messages
      messagesArea.innerHTML = '';
      messagesArea.appendChild(bottomSpacer);

      if (events.length === 0) {
        const empty = h('div', {
          style: {
            textAlign: 'center',
            padding: '48px 16px',
            color: '#7a7060',
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(13px, 3.4vw, 14px)',
          },
        }, 'No messages yet. Say hello!');
        messagesArea.insertBefore(empty, bottomSpacer);
      } else {
        for (const ev of events) {
          appendMessage(ev);
        }
      }

      scrollToBottom(false);

      // Send read receipt for latest message
      sendReadReceiptForLatest();

      // Start real-time sync loop
      setConnectionState('connected');
      startSyncLoop();

    } catch (err: any) {
      loadingIndicator.textContent = 'Failed to load messages';
      loadingIndicator.style.color = '#CE1126';
      setConnectionState('error');
    }
  }

  // ================================================================
  //  Real-time sync loop
  // ================================================================

  async function startSyncLoop() {
    const token = getMatrixToken();
    if (!token || destroyed) return;

    let since: string | undefined;

    // Get initial next_batch
    try {
      const initial = await fetch(`${MATRIX_BASE}/_matrix/client/v3/sync?timeout=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const initData = await initial.json();
      since = initData.next_batch;
    } catch {
      setConnectionState('error');
      return;
    }

    syncLoop(since);
  }

  async function syncLoop(since?: string) {
    if (destroyed) return;

    const token = getMatrixToken();
    if (!token) return;

    try {
      syncAbort = new AbortController();
      setConnectionState('syncing');

      const url = `${MATRIX_BASE}/_matrix/client/v3/sync?since=${since}&timeout=30000`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: syncAbort.signal,
      });

      if (destroyed) return;

      const data = await res.json();
      setConnectionState('connected');

      const joinedRoom = data?.rooms?.join?.[roomId];
      if (joinedRoom) {
        // --- Timeline events ---
        const timelineEvents = joinedRoom.timeline?.events || [];
        let hasNewMessages = false;

        for (const ev of timelineEvents) {
          if (ev.type === 'm.room.message') {
            appendMessage(ev);
            hasNewMessages = true;
          } else if (ev.type === 'm.reaction') {
            // Handle reaction events
            const relatesTo = ev.content?.['m.relates_to'];
            if (relatesTo?.rel_type === 'm.annotation' && relatesTo?.event_id && relatesTo?.key) {
              updateReactionOnBubble(relatesTo.event_id, relatesTo.key);
            }
          }
        }

        if (hasNewMessages) {
          scrollToBottom();
          sendReadReceiptForLatest();
        }

        // --- Ephemeral events (typing, receipts) ---
        const ephemeralEvents = joinedRoom.ephemeral?.events || [];
        for (const ev of ephemeralEvents) {
          if (ev.type === 'm.typing') {
            const typingUserIds: string[] = ev.content?.user_ids || [];
            showTyping(typingUserIds);
          }

          if (ev.type === 'm.receipt') {
            // Update read receipt indicators on sent messages
            const receiptContent = ev.content || {};
            for (const eventId of Object.keys(receiptContent)) {
              const readers = receiptContent[eventId]?.['m.read'] || {};
              for (const userId of Object.keys(readers)) {
                if (userId !== currentUserId) {
                  // Mark bubble as read (blue double check)
                  const el = messagesArea.querySelector(`[data-event-id="${eventId}"]`) as HTMLElement | null;
                  if (el) {
                    const receiptEl = el.querySelector('span:last-child');
                    // Only update if it looks like a receipt indicator
                    if (receiptEl && (receiptEl.textContent === '\u2713' || receiptEl.textContent === '\u2713\u2713')) {
                      receiptEl.textContent = '\u2713\u2713';
                      (receiptEl as HTMLElement).style.color = '#4FC3F7';
                    }
                  }
                }
              }
            }
          }
        }

        // --- State events (member changes, name changes) ---
        const stateEvents = joinedRoom.state?.events || [];
        for (const ev of stateEvents) {
          if (ev.type === 'm.room.name' && ev.content?.name) {
            roomTitle.textContent = ev.content.name;
          }
          if (ev.type === 'm.room.member') {
            if (ev.content?.membership === 'join') {
              memberCount++;
            } else if (ev.content?.membership === 'leave') {
              memberCount = Math.max(0, memberCount - 1);
            }
            if (memberCount > 0) {
              memberLabel.textContent = `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
            }
          }
        }
      }

      // Continue loop
      if (!destroyed) {
        syncLoop(data.next_batch);
      }
    } catch (err: any) {
      if (destroyed || err?.name === 'AbortError') return;
      setConnectionState('error');

      // Retry after delay
      setTimeout(() => {
        if (!destroyed) {
          syncLoop(since);
        }
      }, 5000);
    }
  }

  // ================================================================
  //  Cleanup on navigation
  // ================================================================

  const cleanup = () => {
    destroyed = true;
    if (syncAbort) syncAbort.abort();
    matrixSendTyping(roomId, false).catch(() => {});
    if (typingClearTimer) clearTimeout(typingClearTimer);
    unsubIncoming();
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);
}
