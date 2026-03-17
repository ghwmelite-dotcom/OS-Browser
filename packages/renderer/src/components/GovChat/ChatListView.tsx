import React, { useCallback, useMemo } from 'react';
import { Search, Shield } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import { ChatListItem } from './ChatListItem';
import { PeopleDirectory } from './PeopleDirectory';
import type { ChatFilter } from '@/types/govchat';

/* ─────────── filter tabs ─────────── */

const FILTER_OPTIONS: { key: ChatFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'groups', label: 'Groups' },
  { key: 'direct', label: 'DMs' },
  { key: 'people', label: 'Users Online' },
];

/* ─────────── main component ─────────── */

export function ChatListView() {
  const rooms = useGovChatStore(s => s.rooms);
  const activeRoomId = useGovChatStore(s => s.activeRoomId);
  const chatFilter = useGovChatStore(s => s.chatFilter);
  const searchQuery = useGovChatStore(s => s.searchQuery);
  const setChatFilter = useGovChatStore(s => s.setChatFilter);
  const setSearchQuery = useGovChatStore(s => s.setSearchQuery);
  const selectRoom = useGovChatStore(s => s.selectRoom);
  const togglePinRoom = useGovChatStore(s => s.togglePinRoom);
  const deleteRoom = useGovChatStore(s => s.deleteRoom);
  const markRoomAsRead = useGovChatStore(s => s.markRoomAsRead);

  const filteredRooms = useMemo(() => {
    let result = [...rooms];

    // Apply filter
    switch (chatFilter) {
      case 'unread':
        result = result.filter(r => r.unreadCount > 0);
        break;
      case 'groups':
        result = result.filter(r => !r.isDirect);
        break;
      case 'direct':
        result = result.filter(r => r.isDirect);
        break;
      // 'all' — no filter
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.topic?.toLowerCase().includes(q) ||
        r.members.some(m => m.displayName.toLowerCase().includes(q)) ||
        r.ministry?.name.toLowerCase().includes(q),
      );
    }

    // Sort: pinned first, then by last message timestamp desc
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.lastMessage?.timestamp ?? a.createdAt;
      const bTime = b.lastMessage?.timestamp ?? b.createdAt;
      return bTime - aTime;
    });
  }, [rooms, chatFilter, searchQuery]);

  const handleSelectRoom = (roomId: string) => {
    selectRoom(roomId);
    markRoomAsRead(roomId);
  };

  const handleStartChat = useCallback(async (userId: string, displayName: string) => {
    const roomId = await useGovChatStore.getState().createDirectRoom(userId, displayName);
    if (roomId) {
      selectRoom(roomId);
    }
    setChatFilter('all');
  }, [setChatFilter, selectRoom]);

  return (
    <>
      {/* Filter tabs */}
      <div
        className="flex items-center gap-0.5 px-2 pt-2 pb-1 shrink-0"
      >
        {FILTER_OPTIONS.map(opt => {
          const isActive = chatFilter === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setChatFilter(opt.key)}
              className="flex-1 py-1 rounded-md text-[10px] font-semibold transition-colors"
              style={{
                background: isActive ? 'rgba(0, 107, 63, 0.12)' : 'transparent',
                color: isActive ? '#006B3F' : 'var(--color-text-muted)',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* People directory OR normal chat list */}
      {chatFilter === 'people' ? (
        <PeopleDirectory onStartChat={handleStartChat} />
      ) : (
        <>
          {/* Search bar */}
          <div className="px-2 py-1.5 shrink-0">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <Search size={12} className="text-text-muted shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                className="flex-1 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-muted min-w-0"
              />
            </div>
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {filteredRooms.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-[11px] text-text-muted">
                  {searchQuery
                    ? 'No rooms match your search'
                    : chatFilter !== 'all'
                    ? 'No rooms in this filter'
                    : 'No conversations yet'}
                </p>
              </div>
            ) : (
              filteredRooms.map(room => (
                <ChatListItem
                  key={room.roomId}
                  room={room}
                  isActive={room.roomId === activeRoomId}
                  onSelect={() => handleSelectRoom(room.roomId)}
                  onPin={() => togglePinRoom(room.roomId)}
                  onDelete={() => deleteRoom(room.roomId)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Bottom classification notice */}
      <div className="px-2 py-2 border-t shrink-0" style={{ borderColor: 'var(--color-border-1)' }}>
        <p className="text-[9px] text-text-muted text-center leading-tight flex items-center justify-center gap-1">
          <Shield size={8} style={{ color: '#D4A017' }} />
          Messages classified per government policy
        </p>
      </div>
    </>
  );
}
