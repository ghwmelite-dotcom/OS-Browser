import { h, render } from '../utils/dom';
import { navigate } from '../router';
import { relativeTime, truncate } from '../utils/format';
import { matrixSync, matrixCreateDMRoom, matrixCreateGroupRoom, matrixGetRoomMembers, matrixGetAllRoomMembers } from '../api';

const CACHE_KEY = 'os_mobile_chat_rooms_cache';

type FilterTab = 'all' | 'unread' | 'groups' | 'direct';

interface RoomSummary {
  roomId: string;
  name: string;
  nameResolved: boolean;
  lastMessage: string;
  lastSender: string;
  lastTs: number;
  unreadCount: number;
  memberCount: number;
  isDirect: boolean;
}

/* ── State ───────────────────────────────────── */

let allRooms: RoomSummary[] = [];
let activeFilter: FilterTab = 'all';
let searchQuery = '';
let listContainer: HTMLElement | null = null;
let isRefreshing = false;

/* ── Helpers ─────────────────────────────────── */

/** Deterministic color from a string */
function avatarColor(str: string): string {
  const colors = ['#D4A017', '#CE1126', '#006B3F', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

/** Determine if a room looks like a DM */
function detectDirect(name: string, memberCount: number): boolean {
  if (memberCount <= 2) return true;
  // Names that look like @user:server or a single username
  if (/^@[^:]+:[^.]+\..+$/.test(name)) return true;
  return false;
}

/** Get the current user's Matrix ID */
function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('os_mobile_credentials');
    if (raw) {
      const creds = JSON.parse(raw);
      return creds.userId || creds.user_id || '';
    }
  } catch {}
  return '';
}

/** Parse sync response into sorted room summaries */
function parseSyncRooms(data: any): RoomSummary[] {
  const joined = data?.rooms?.join;
  if (!joined) return [];

  const currentUser = getCurrentUserId();
  const rooms: RoomSummary[] = [];

  for (const [roomId, roomData] of Object.entries<any>(joined)) {
    let name = '';
    let memberCount = 0;
    const memberNames = new Map<string, string>(); // userId → displayName

    // Collect state events from both state and timeline
    const stateEvents = roomData?.state?.events || [];
    const tlEvents = roomData?.timeline?.events || [];
    const allEvents = [...stateEvents, ...tlEvents];

    for (const ev of allEvents) {
      if (ev.type === 'm.room.name' && ev.content?.name) {
        name = ev.content.name;
      }
      if (ev.type === 'm.room.member' && ev.content?.membership === 'join') {
        const userId = ev.state_key || ev.sender;
        if (userId) {
          memberNames.set(userId, ev.content?.displayname || userId.split(':')[0].replace('@', ''));
        }
        memberCount++;
      }
    }

    // Deduplicate member count (same user may appear in both state and timeline)
    memberCount = memberNames.size || memberCount || 2;

    // Resolve room name for DMs: use the other member's display name
    let nameResolved = false;
    if (name && name !== roomId) {
      // Got a proper m.room.name from state events
      nameResolved = true;
    }

    if (!nameResolved) {
      // Check for m.heroes in summary (Matrix provides this for unnamed rooms)
      const heroes: string[] = (roomData as any)?.summary?.['m.heroes'] || [];
      if (heroes.length > 0) {
        const heroNames = heroes.filter(h => h !== currentUser);
        // Only use heroes if we have their display names in memberNames
        const resolved = heroNames.map(h => {
          const dn = memberNames.get(h);
          return dn ? { name: dn, fromMap: true } : { name: h.split(':')[0].replace('@', ''), fromMap: false };
        });
        if (resolved.length > 0) {
          name = resolved.map(r => r.name).join(', ');
          // Only mark resolved if at least one name came from actual member data
          nameResolved = resolved.some(r => r.fromMap);
        }
      }
    }

    // Still no name? Find the other member's display name from member events
    if (!nameResolved) {
      const otherMembers = Array.from(memberNames.entries())
        .filter(([id]) => id !== currentUser);
      if (otherMembers.length > 0) {
        name = otherMembers.map(([, dn]) => dn).join(', ');
        nameResolved = true;
      } else if (!name || name === roomId) {
        // Last resort: strip the room ID — mark as unresolved
        name = roomId.split(':')[0].replace('!', '');
        nameResolved = false;
      }
    }

    // Last message from timeline
    let lastMessage = '';
    let lastSender = '';
    let lastTs = 0;
    for (let i = tlEvents.length - 1; i >= 0; i--) {
      const ev = tlEvents[i];
      if (ev.type === 'm.room.message') {
        lastMessage = ev.content?.body || '';
        // Resolve sender display name
        lastSender = memberNames.get(ev.sender)
          || ev.sender?.split(':')[0]?.replace('@', '')
          || '';
        lastTs = ev.origin_server_ts || 0;
        break;
      }
    }

    const unreadCount = roomData?.unread_notifications?.notification_count || 0;
    const isDirect = detectDirect(name, memberCount);

    rooms.push({ roomId, name, nameResolved, lastMessage, lastSender, lastTs, unreadCount, memberCount, isDirect });
  }

  rooms.sort((a, b) => b.lastTs - a.lastTs);
  return rooms;
}

/* ── Filtering ───────────────────────────────── */

function getFilteredRooms(): RoomSummary[] {
  let rooms = allRooms;

  // Apply filter tab
  switch (activeFilter) {
    case 'unread':
      rooms = rooms.filter(r => r.unreadCount > 0);
      break;
    case 'groups':
      rooms = rooms.filter(r => !r.isDirect);
      break;
    case 'direct':
      rooms = rooms.filter(r => r.isDirect);
      break;
  }

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    rooms = rooms.filter(r => r.name.toLowerCase().includes(q));
  }

  return rooms;
}

/* ── Room Item ───────────────────────────────── */

function createRoomItem(room: RoomSummary): HTMLElement {
  const initial = room.name.charAt(0).toUpperCase();
  const color = avatarColor(room.name);

  // Avatar with optional online dot for DMs
  const avatarWrapper = h('div', {
    style: {
      position: 'relative',
      flexShrink: '0',
    },
  },
    h('div', {
      style: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(17px, 4.4vw, 19px)',
        fontWeight: '700',
        color: '#fff',
      },
    }, initial),
    // Online status dot for DMs
    ...(room.isDirect ? [
      h('div', {
        style: {
          position: 'absolute',
          bottom: '1px',
          right: '1px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#22c55e',
          border: '2px solid #000',
        },
      })
    ] : [])
  );

  const preview = room.lastMessage
    ? truncate(room.lastMessage, 50)
    : 'No messages yet';

  const middle = h('div', {
    style: {
      flex: '1',
      minWidth: '0',
      overflow: 'hidden',
    },
  },
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(15px, 4vw, 17px)',
        fontWeight: '600',
        color: room.unreadCount > 0 ? '#f0f0f0' : '#e0e0e0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    }, room.name),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 14px)',
        color: room.unreadCount > 0 ? '#a09080' : '#7a7060',
        marginTop: '3px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: room.unreadCount > 0 ? '500' : '400',
      },
    }, room.lastSender ? `${room.lastSender}: ${preview}` : preview)
  );

  const rightChildren: HTMLElement[] = [];
  if (room.lastTs) {
    rightChildren.push(
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(11px, 2.8vw, 12px)',
          color: room.unreadCount > 0 ? '#D4A017' : '#7a7060',
          whiteSpace: 'nowrap',
        },
      }, relativeTime(room.lastTs))
    );
  }
  if (room.unreadCount > 0) {
    rightChildren.push(
      h('div', {
        style: {
          minWidth: '20px',
          height: '20px',
          borderRadius: '10px',
          background: '#D4A017',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(11px, 2.8vw, 12px)',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 6px',
          marginTop: '4px',
          alignSelf: 'flex-end',
        },
      }, String(room.unreadCount))
    );
  }

  const right = h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      flexShrink: '0',
    },
  }, ...rightChildren);

  const item = h('div', {
    className: 'chat-item',
    onClick: () => navigate('/chat/' + encodeURIComponent(room.roomId)),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      transition: 'background 0.15s ease',
    },
  }, avatarWrapper, middle, right);

  // Tap feedback
  item.addEventListener('pointerdown', () => { item.style.background = 'rgba(212,160,23,0.08)'; });
  item.addEventListener('pointerup', () => { item.style.background = 'transparent'; });
  item.addEventListener('pointerleave', () => { item.style.background = 'transparent'; });

  return item;
}

/* ── Empty States ────────────────────────────── */

function createEmptyState(filter: FilterTab): HTMLElement {
  const messages: Record<FilterTab, { icon: string; title: string; subtitle: string }> = {
    all: {
      icon: '\uD83D\uDCAC',
      title: 'No conversations yet',
      subtitle: 'Start a new chat or join a room to begin messaging.',
    },
    unread: {
      icon: '\u2705',
      title: 'All caught up',
      subtitle: 'No unread messages. You\'re on top of everything.',
    },
    groups: {
      icon: '\uD83D\uDC65',
      title: 'No group chats yet',
      subtitle: 'Create a group to start collaborating with your team.',
    },
    direct: {
      icon: '\uD83D\uDCE8',
      title: 'No direct messages',
      subtitle: 'Start a conversation with a colleague.',
    },
  };

  const msg = messages[filter];

  return h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '1',
      padding: '48px 24px',
      textAlign: 'center',
      gap: '12px',
    },
  },
    h('div', { style: { fontSize: '40px' } }, msg.icon),
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(17px, 4.4vw, 19px)',
        fontWeight: '600',
        color: '#e0e0e0',
      },
    }, msg.title),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(13px, 3.4vw, 14px)',
        color: '#7a7060',
        lineHeight: '1.5',
      },
    }, msg.subtitle)
  );
}

function createSearchEmptyState(): HTMLElement {
  return h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '1',
      padding: '48px 24px',
      textAlign: 'center',
      gap: '12px',
    },
  },
    h('div', { style: { fontSize: '40px' } }, '\uD83D\uDD0D'),
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(17px, 4.4vw, 19px)',
        fontWeight: '600',
        color: '#e0e0e0',
      },
    }, 'No results found'),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(13px, 3.4vw, 14px)',
        color: '#7a7060',
        lineHeight: '1.5',
      },
    }, 'Try a different search term.')
  );
}

function createErrorState(message: string): HTMLElement {
  return h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '1',
      padding: '48px 24px',
      textAlign: 'center',
      gap: '12px',
    },
  },
    h('div', { style: { fontSize: '40px' } }, '\u26A0\uFE0F'),
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(17px, 4.4vw, 19px)',
        color: '#e0e0e0',
        fontWeight: '500',
      },
    }, 'Unable to connect'),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 14px)',
        color: '#7a7060',
      },
    }, message)
  );
}

/* ── Search Bar ──────────────────────────────── */

function createSearchBar(): HTMLElement {
  const input = h('input', {
    type: 'text',
    placeholder: 'Search conversations\u2026',
    style: {
      width: '100%',
      padding: '10px 14px 10px 38px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#0d0d0d',
      color: '#e0e0e0',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(14px, 3.6vw, 15px)',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      boxSizing: 'border-box',
    },
  }) as HTMLInputElement;

  input.addEventListener('focus', () => {
    input.style.borderColor = 'rgba(212,160,23,0.5)';
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = 'rgba(255,255,255,0.08)';
  });
  input.addEventListener('input', () => {
    searchQuery = input.value;
    rerenderRoomList();
  });

  // Search icon (SVG magnifying glass)
  const searchIcon = h('div', {
    style: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#7a7060',
      fontSize: '15px',
      pointerEvents: 'none',
      lineHeight: '1',
    },
    innerHTML: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  });

  return h('div', {
    style: {
      position: 'relative',
      padding: '8px 16px 4px',
    },
  }, searchIcon, input);
}

/* ── Filter Tabs ─────────────────────────────── */

function createFilterTabs(): HTMLElement {
  const tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
    { label: 'Groups', value: 'groups' },
    { label: 'Direct', value: 'direct' },
  ];

  const pillsContainer = h('div', {
    className: 'filter-tabs',
    style: {
      display: 'flex',
      gap: '8px',
      padding: '8px 16px 12px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
  });

  // Hide scrollbar via inline style workaround
  const style = document.createElement('style');
  style.textContent = '.filter-tabs::-webkit-scrollbar { display: none; }';
  pillsContainer.appendChild(style);

  for (const tab of tabs) {
    const isActive = tab.value === activeFilter;
    const pill = h('button', {
      style: {
        padding: '6px 16px',
        borderRadius: '20px',
        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
        background: isActive ? '#D4A017' : 'transparent',
        color: isActive ? '#000' : '#a0a0a0',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(12px, 3.2vw, 14px)',
        fontWeight: isActive ? '700' : '500',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: '0',
        transition: 'all 0.15s ease',
      },
    }, tab.label);

    pill.addEventListener('click', () => {
      activeFilter = tab.value;
      rerenderFilterTabs();
      rerenderRoomList();
    });

    pillsContainer.appendChild(pill);
  }

  return pillsContainer;
}

let filterTabsContainer: HTMLElement | null = null;

function rerenderFilterTabs(): void {
  if (!filterTabsContainer) return;
  const parent = filterTabsContainer.parentElement;
  if (!parent) return;
  const newTabs = createFilterTabs();
  parent.replaceChild(newTabs, filterTabsContainer);
  filterTabsContainer = newTabs;
}

/* ── Room List Rendering ─────────────────────── */

function rerenderRoomList(): void {
  if (!listContainer) return;
  const rooms = getFilteredRooms();
  listContainer.innerHTML = '';

  if (rooms.length === 0) {
    if (searchQuery.trim()) {
      listContainer.appendChild(createSearchEmptyState());
    } else {
      listContainer.appendChild(createEmptyState(activeFilter));
    }
    return;
  }

  for (const room of rooms) {
    listContainer.appendChild(createRoomItem(room));
  }
}

/* ── Bottom Sheet Modal ──────────────────────── */

function showBottomSheet(): void {
  // Overlay
  const overlay = h('div', {
    style: {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.6)',
      zIndex: '100',
      animation: 'fadeIn 0.2s ease',
    },
  });

  // Sheet
  const sheet = h('div', {
    style: {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      background: '#141414',
      borderRadius: '20px 20px 0 0',
      padding: '20px 16px',
      paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      zIndex: '101',
      transform: 'translateY(100%)',
      transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      maxHeight: '85vh',
      overflowY: 'auto',
    },
  });

  // Grab handle
  const handle = h('div', {
    style: {
      width: '36px',
      height: '4px',
      borderRadius: '2px',
      background: 'rgba(255,255,255,0.2)',
      margin: '0 auto 20px',
    },
  });

  // Title
  const title = h('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(18px, 4.6vw, 20px)',
      fontWeight: '700',
      color: '#e0e0e0',
      marginBottom: '20px',
    },
  }, 'New Conversation');

  // Content area that will swap between menu / form
  const contentArea = h('div', {});

  function showMenu() {
    contentArea.innerHTML = '';
    contentArea.appendChild(createMenuOptions());
  }

  function createMenuOptions(): HTMLElement {
    const wrapper = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } });

    // New Direct Message option
    const dmOption = createSheetOption(
      '\uD83D\uDCE8',
      'New Direct Message',
      'Start a private conversation',
      () => showDMForm()
    );

    // New Group option
    const groupOption = createSheetOption(
      '\uD83D\uDC65',
      'New Group',
      'Create a group conversation',
      () => showGroupForm()
    );

    wrapper.appendChild(dmOption);
    wrapper.appendChild(groupOption);
    return wrapper;
  }

  function createSheetOption(icon: string, label: string, subtitle: string, onClick: () => void): HTMLElement {
    const opt = h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 12px',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      },
    },
      h('div', {
        style: {
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(212,160,23,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: '0',
        },
      }, icon),
      h('div', { style: { flex: '1' } },
        h('div', {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(15px, 4vw, 16px)',
            fontWeight: '600',
            color: '#e0e0e0',
          },
        }, label),
        h('div', {
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(12px, 3.2vw, 13px)',
            color: '#7a7060',
            marginTop: '2px',
          },
        }, subtitle)
      )
    );

    opt.addEventListener('pointerdown', () => { opt.style.background = 'rgba(255,255,255,0.05)'; });
    opt.addEventListener('pointerup', () => { opt.style.background = 'transparent'; });
    opt.addEventListener('pointerleave', () => { opt.style.background = 'transparent'; });
    opt.addEventListener('click', onClick);

    return opt;
  }

  function inputStyle(): Record<string, string> {
    return {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#0d0d0d',
      color: '#e0e0e0',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(14px, 3.6vw, 15px)',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      boxSizing: 'border-box',
    };
  }

  function attachInputFocus(input: HTMLInputElement) {
    input.addEventListener('focus', () => { input.style.borderColor = 'rgba(212,160,23,0.5)'; });
    input.addEventListener('blur', () => { input.style.borderColor = 'rgba(255,255,255,0.08)'; });
  }

  function createSubmitButton(label: string, loading: boolean): HTMLElement {
    return h('button', {
      style: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        border: 'none',
        background: loading ? '#8a6a0e' : 'linear-gradient(135deg, #D4A017, #b8860b)',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(15px, 4vw, 16px)',
        fontWeight: '700',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? '0.7' : '1',
        transition: 'all 0.15s ease',
      },
      disabled: loading,
    }, loading ? 'Creating\u2026' : label);
  }

  function createBackButton(onClick: () => void): HTMLElement {
    const btn = h('button', {
      style: {
        padding: '6px 0',
        background: 'none',
        border: 'none',
        color: '#D4A017',
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(13px, 3.4vw, 14px)',
        cursor: 'pointer',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      },
    }, '\u2190 Back');
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createErrorMsg(msg: string): HTMLElement {
    return h('div', {
      style: {
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#ef4444',
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 13px)',
        marginTop: '8px',
      },
    }, msg);
  }

  function showDMForm() {
    contentArea.innerHTML = '';
    title.textContent = 'New Direct Message';

    const back = createBackButton(() => {
      title.textContent = 'New Conversation';
      showMenu();
    });

    const label = h('label', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 13px)',
        color: '#7a7060',
        marginBottom: '6px',
        display: 'block',
      },
    }, 'User ID');

    const input = h('input', {
      type: 'text',
      placeholder: '@username:govchat.askozzy.work',
      style: inputStyle(),
    }) as HTMLInputElement;
    attachInputFocus(input);

    const submitBtn = createSubmitButton('Start Chat', false);
    const errorContainer = h('div', {});

    submitBtn.addEventListener('click', async () => {
      const userId = input.value.trim();
      if (!userId) {
        errorContainer.innerHTML = '';
        errorContainer.appendChild(createErrorMsg('Please enter a user ID.'));
        return;
      }
      if (!userId.startsWith('@') || !userId.includes(':')) {
        errorContainer.innerHTML = '';
        errorContainer.appendChild(createErrorMsg('User ID must be in the format @user:server'));
        return;
      }

      errorContainer.innerHTML = '';
      const newBtn = createSubmitButton('Start Chat', true);
      submitBtn.replaceWith(newBtn);

      try {
        const roomId = await matrixCreateDMRoom(userId);
        closeSheet();
        if (roomId) {
          navigate('/chat/' + encodeURIComponent(roomId));
        }
      } catch (err: any) {
        newBtn.replaceWith(submitBtn);
        errorContainer.innerHTML = '';
        errorContainer.appendChild(createErrorMsg(err?.message || 'Failed to create room'));
      }
    });

    contentArea.appendChild(
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        back, label, input, errorContainer, submitBtn
      )
    );

    setTimeout(() => input.focus(), 100);
  }

  function showGroupForm() {
    contentArea.innerHTML = '';
    title.textContent = 'New Group';

    const back = createBackButton(() => {
      title.textContent = 'New Conversation';
      showMenu();
    });

    const nameLabel = h('label', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 13px)',
        color: '#7a7060',
        marginBottom: '6px',
        display: 'block',
      },
    }, 'Group Name');

    const nameInput = h('input', {
      type: 'text',
      placeholder: 'e.g. Finance Team',
      style: inputStyle(),
    }) as HTMLInputElement;
    attachInputFocus(nameInput);

    const membersLabel = h('label', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 13px)',
        color: '#7a7060',
        marginBottom: '6px',
        marginTop: '4px',
        display: 'block',
      },
    }, 'Invite Members (comma-separated user IDs)');

    const membersInput = h('input', {
      type: 'text',
      placeholder: '@user1:server, @user2:server',
      style: inputStyle(),
    }) as HTMLInputElement;
    attachInputFocus(membersInput);

    const submitBtn = createSubmitButton('Create Group', false);
    const errorContainer = h('div', {});

    submitBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const membersRaw = membersInput.value.trim();

      if (!name) {
        errorContainer.innerHTML = '';
        errorContainer.appendChild(createErrorMsg('Please enter a group name.'));
        return;
      }

      const members = membersRaw
        ? membersRaw.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

      errorContainer.innerHTML = '';
      const newBtn = createSubmitButton('Create Group', true);
      submitBtn.replaceWith(newBtn);

      try {
        const roomId = await matrixCreateGroupRoom(name, members);
        closeSheet();
        if (roomId) {
          navigate('/chat/' + encodeURIComponent(roomId));
        }
      } catch (err: any) {
        newBtn.replaceWith(submitBtn);
        errorContainer.innerHTML = '';
        errorContainer.appendChild(createErrorMsg(err?.message || 'Failed to create group'));
      }
    });

    contentArea.appendChild(
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        back, nameLabel, nameInput, membersLabel, membersInput, errorContainer, submitBtn
      )
    );

    setTimeout(() => nameInput.focus(), 100);
  }

  function closeSheet() {
    sheet.style.transform = 'translateY(100%)';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
      overlay.remove();
      sheet.remove();
      sheetStyle.remove();
    }, 300);
  }

  overlay.addEventListener('click', closeSheet);

  sheet.appendChild(handle);
  sheet.appendChild(title);
  sheet.appendChild(contentArea);

  // Inject animation keyframes
  const sheetStyle = document.createElement('style');
  sheetStyle.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `;
  document.body.appendChild(sheetStyle);
  document.body.appendChild(overlay);
  document.body.appendChild(sheet);

  showMenu();

  // Animate sheet in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sheet.style.transform = 'translateY(0)';
    });
  });
}

/* ── FAB ─────────────────────────────────────── */

function createFAB(): HTMLElement {
  const fab = h('button', {
    className: 'chat-fab',
    style: {
      position: 'fixed',
      bottom: '72px',
      right: '16px',
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #D4A017, #b8860b)',
      color: '#fff',
      fontSize: '24px',
      fontWeight: '300',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(212,160,23,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '40',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    },
  }, '+');

  fab.addEventListener('pointerdown', () => {
    fab.style.transform = 'scale(0.92)';
    fab.style.boxShadow = '0 2px 6px rgba(212,160,23,0.3)';
  });
  fab.addEventListener('pointerup', () => {
    fab.style.transform = 'scale(1)';
    fab.style.boxShadow = '0 4px 12px rgba(212,160,23,0.35)';
  });
  fab.addEventListener('pointerleave', () => {
    fab.style.transform = 'scale(1)';
    fab.style.boxShadow = '0 4px 12px rgba(212,160,23,0.35)';
  });
  fab.addEventListener('click', () => showBottomSheet());

  return fab;
}

/* ── Pull-to-Refresh ─────────────────────────── */

function setupPullToRefresh(scrollContainer: HTMLElement, refreshIndicator: HTMLElement): void {
  let startY = 0;
  let pulling = false;

  scrollContainer.addEventListener('touchstart', (e: TouchEvent) => {
    if (scrollContainer.scrollTop === 0 && !isRefreshing) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  scrollContainer.addEventListener('touchmove', (e: TouchEvent) => {
    if (!pulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0 && diff < 120) {
      const progress = Math.min(diff / 80, 1);
      refreshIndicator.style.height = `${Math.floor(diff * 0.6)}px`;
      refreshIndicator.style.opacity = String(progress);
      refreshIndicator.textContent = progress >= 1 ? 'Release to refresh' : 'Pull to refresh';
    }
  }, { passive: true });

  scrollContainer.addEventListener('touchend', async () => {
    if (!pulling || isRefreshing) return;
    pulling = false;

    const height = parseInt(refreshIndicator.style.height || '0');
    if (height >= 48) {
      // Trigger refresh
      isRefreshing = true;
      refreshIndicator.style.height = '40px';
      refreshIndicator.style.opacity = '1';
      refreshIndicator.textContent = 'Refreshing\u2026';

      try {
        const data = await matrixSync();
        const rooms = parseSyncRooms(data);
        allRooms = rooms;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(rooms)); } catch {}
        rerenderRoomList();
      } catch {}

      isRefreshing = false;
    }

    // Collapse indicator
    refreshIndicator.style.transition = 'height 0.2s ease, opacity 0.2s ease';
    refreshIndicator.style.height = '0px';
    refreshIndicator.style.opacity = '0';
    setTimeout(() => {
      refreshIndicator.style.transition = '';
    }, 200);
  });
}

/* ── Main Render ─────────────────────────────── */

export function renderChatList(container: HTMLElement): void {
  // Reset state
  activeFilter = 'all';
  searchQuery = '';

  // Header
  const header = h('header', {
    className: 'app-header',
    style: {
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      paddingTop: 'env(safe-area-inset-top)',
      background: '#000000',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      gap: '10px',
    },
  },
    h('div', {
      style: {
        width: '28px',
        height: '28px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #CE1126, #D4A017, #006B3F)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '800',
        color: '#fff',
      },
    }, 'GC'),
    h('span', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(17px, 4.4vw, 19px)',
        fontWeight: '700',
        flex: '1',
      },
    }, 'GovChat')
  );

  // Search bar
  const searchBar = createSearchBar();

  // Filter tabs
  filterTabsContainer = createFilterTabs();

  // Pull-to-refresh indicator
  const refreshIndicator = h('div', {
    style: {
      height: '0px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(12px, 3.2vw, 13px)',
      color: '#7a7060',
      opacity: '0',
    },
  });

  // Scrollable room list container
  listContainer = h('div', {
    className: 'chat-list',
    style: {
      flex: '1',
      overflowY: 'auto',
      paddingBottom: '80px',
      WebkitOverflowScrolling: 'touch',
    },
  });

  // Loading state
  const loader = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
      color: '#7a7060',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(13px, 3.4vw, 14px)',
    },
  }, 'Loading conversations\u2026');
  listContainer.appendChild(loader);

  // Scrollable wrapper (contains refresh indicator + list)
  const scrollWrapper = h('div', {
    style: {
      flex: '1',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      WebkitOverflowScrolling: 'touch',
    },
  }, refreshIndicator, listContainer);

  // Setup pull-to-refresh on the scroll wrapper
  setupPullToRefresh(scrollWrapper, refreshIndicator);

  render(container, header, searchBar, filterTabsContainer, scrollWrapper, createFAB());

  // Fetch rooms
  loadRooms();
}

async function loadRooms(): Promise<void> {
  if (!listContainer) return;

  try {
    const data = await matrixSync();
    const rooms = parseSyncRooms(data);
    allRooms = rooms;

    rerenderRoomList();

    // Resolve names for rooms that couldn't be named from sync data
    const currentUser = getCurrentUserId();
    const unresolvedRooms = rooms.filter(r => !r.nameResolved);

    if (unresolvedRooms.length > 0) {
      const resolvePromises = unresolvedRooms.map(async (room) => {
        try {
          // First try joined members
          const members = await matrixGetRoomMembers(room.roomId);
          let others = members.filter((m: any) => m.userId !== currentUser);

          // If no other joined members, fetch ALL members (including invited/left)
          if (others.length === 0) {
            const allMembers = await matrixGetAllRoomMembers(room.roomId);
            others = allMembers.filter((m: any) => m.userId !== currentUser);
          }

          if (others.length > 0) {
            room.name = others
              .map((m: any) => m.displayName || m.userId?.split(':')[0]?.replace('@', '') || 'Unknown')
              .join(', ');
            room.nameResolved = true;
          }
        } catch { /* skip rooms we can't fetch members for */ }
      });

      await Promise.allSettled(resolvePromises);
      rerenderRoomList();
    }

    // Cache resolved rooms
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(allRooms));
    } catch {}

  } catch (err: any) {
    // Try loading from cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const rooms: RoomSummary[] = JSON.parse(cached);
        allRooms = rooms;
        rerenderRoomList();
        return;
      }
    } catch {}

    if (listContainer) {
      listContainer.innerHTML = '';
      listContainer.appendChild(
        createErrorState(err?.message || 'Could not reach the chat server')
      );
    }
  }
}
