import React, { useState, useMemo } from 'react';
import { Search, X, Users, ChevronRight, ChevronLeft, Shield, Check } from 'lucide-react';
import type { GovUser, ClassificationLevel } from '@/types/govchat';
import { useGovChatStore } from '@/store/govchat';

/* -------------------------------------------------------------------------- */
/*  Sample staff directory (demo / local mode)                                */
/* -------------------------------------------------------------------------- */

const sampleStaff: GovUser[] = [
  {
    userId: '@kwame.mensah:gov.gh',
    staffId: 'GH-MOF-0042',
    displayName: 'Kwame Mensah',
    department: 'Budget Division',
    ministry: 'Ministry of Finance',
    role: 'user',
    isOnline: true,
    lastSeen: null,
  },
  {
    userId: '@akua.boateng:gov.gh',
    staffId: 'GH-OHCS-0118',
    displayName: 'Akua Boateng',
    department: 'HR Policy',
    ministry: 'OHCS',
    role: 'user',
    isOnline: false,
    lastSeen: Date.now() - 7200000,
  },
  {
    userId: '@yaw.asante:gov.gh',
    staffId: 'GH-GRA-0305',
    displayName: 'Yaw Asante',
    department: 'Tax Revenue',
    ministry: 'GRA',
    role: 'user',
    isOnline: true,
    lastSeen: null,
  },
  {
    userId: '@ama.darko:gov.gh',
    staffId: 'GH-MOH-0201',
    displayName: 'Ama Darko',
    department: 'Disease Control',
    ministry: 'Ministry of Health',
    role: 'user',
    isOnline: false,
    lastSeen: Date.now() - 3600000,
  },
  {
    userId: '@kofi.owusu:gov.gh',
    staffId: 'GH-MOE-0089',
    displayName: 'Kofi Owusu',
    department: 'Curriculum Development',
    ministry: 'Ministry of Education',
    role: 'admin',
    isOnline: true,
    lastSeen: null,
  },
];

/* -------------------------------------------------------------------------- */
/*  Classification options                                                     */
/* -------------------------------------------------------------------------- */

const CLASSIFICATION_OPTIONS: { value: ClassificationLevel; label: string; color: string }[] = [
  { value: 'UNCLASSIFIED', label: 'Unclassified', color: '#006B3F' },
  { value: 'OFFICIAL', label: 'Official', color: '#D4A017' },
  { value: 'SENSITIVE', label: 'Sensitive', color: '#CE1126' },
  { value: 'SECRET', label: 'Secret', color: '#CE1126' },
];

/* -------------------------------------------------------------------------- */
/*  Helper: initials avatar                                                    */
/* -------------------------------------------------------------------------- */

function InitialsAvatar({ name, isOnline }: { name: string; isOnline: boolean }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative flex-shrink-0">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: '#006B3F' }}
      >
        {initials}
      </div>
      <span
        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2"
        style={{
          borderColor: 'var(--color-surface-1)',
          backgroundColor: isOnline ? '#006B3F' : 'var(--color-text-muted)',
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Contact row                                                                */
/* -------------------------------------------------------------------------- */

interface ContactRowProps {
  user: GovUser;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

function ContactRow({ user, selectable, selected, onToggle, onClick }: ContactRowProps) {
  return (
    <button
      type="button"
      onClick={selectable ? onToggle : onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:brightness-95"
      style={{ backgroundColor: selected ? 'var(--color-surface-2)' : 'transparent' }}
    >
      {selectable && (
        <div
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border"
          style={{
            borderColor: selected ? '#006B3F' : 'var(--color-border-1)',
            backgroundColor: selected ? '#006B3F' : 'transparent',
          }}
        >
          {selected && <Check size={14} className="text-white" />}
        </div>
      )}
      <InitialsAvatar name={user.displayName} isOnline={user.isOnline} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {user.displayName}
        </p>
        <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {user.department} &middot; {user.ministry}
        </p>
      </div>
      {!selectable && <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

interface ContactPickerViewProps {
  mode: 'dm' | 'group';
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/*  DM Mode                                                                    */
/* -------------------------------------------------------------------------- */

function DMPicker({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const createDirectRoom = useGovChatStore((s) => s.createDirectRoom);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sampleStaff;
    return sampleStaff.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.ministry.toLowerCase().includes(q),
    );
  }, [search]);

  const handleSelect = async (userId: string) => {
    await createDirectRoom(userId);
    onClose();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: 'var(--color-surface-2)' }}
        >
          <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, department..."
            className="flex-1 border-none bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}>
              <X size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No contacts found
          </p>
        ) : (
          filtered.map((user) => (
            <ContactRow key={user.userId} user={user} onClick={() => handleSelect(user.userId)} />
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Group Mode                                                                 */
/* -------------------------------------------------------------------------- */

type GroupStep = 'details' | 'members' | 'confirm';

function GroupPicker({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<GroupStep>('details');
  const [groupName, setGroupName] = useState('');
  const [classification, setClassification] = useState<ClassificationLevel>('OFFICIAL');
  const [ministryTag, setMinistryTag] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const createGroupRoom = useGovChatStore((s) => s.createGroupRoom);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sampleStaff;
    return sampleStaff.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.ministry.toLowerCase().includes(q),
    );
  }, [search]);

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectedStaff = sampleStaff.filter((u) => selectedIds.has(u.userId));

  const handleCreate = async () => {
    await createGroupRoom(groupName, Array.from(selectedIds), classification);
    onClose();
  };

  /* Step 1 — Group details */
  if (step === 'details') {
    return (
      <div className="flex h-full flex-col px-4">
        <div className="flex-1 space-y-5 py-2">
          {/* Group name */}
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Budget Review Committee"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Classification selector */}
          <div>
            <label
              className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Shield size={12} /> Classification
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setClassification(opt.value)}
                  className="rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    borderColor:
                      classification === opt.value ? opt.color : 'var(--color-border-1)',
                    backgroundColor:
                      classification === opt.value ? opt.color + '18' : 'var(--color-surface-2)',
                    color: classification === opt.value ? opt.color : 'var(--color-text-primary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ministry / department tag */}
          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Ministry / Department Tag{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={ministryTag}
              onChange={(e) => setMinistryTag(e.target.value)}
              placeholder="e.g. Ministry of Finance"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Next button */}
        <div className="pb-4 pt-2">
          <button
            type="button"
            onClick={() => setStep('members')}
            disabled={!groupName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#006B3F' }}
          >
            Next: Select Members <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  /* Step 2 — Select members */
  if (step === 'members') {
    return (
      <div className="flex h-full flex-col">
        {/* Selected chips */}
        {selectedStaff.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {selectedStaff.map((u) => (
              <span
                key={u.userId}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: '#006B3F20', color: '#006B3F' }}
              >
                {u.displayName}
                <button type="button" onClick={() => toggleUser(u.userId)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: 'var(--color-surface-2)' }}
          >
            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="flex-1 border-none bg-transparent text-sm outline-none"
              style={{ color: 'var(--color-text-primary)' }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}
          </div>
        </div>

        {/* Contact list with checkboxes */}
        <div className="flex-1 overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No contacts found
            </p>
          ) : (
            filtered.map((user) => (
              <ContactRow
                key={user.userId}
                user={user}
                selectable
                selected={selectedIds.has(user.userId)}
                onToggle={() => toggleUser(user.userId)}
              />
            ))
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={() => setStep('details')}
            className="flex items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            type="button"
            onClick={() => setStep('confirm')}
            disabled={selectedIds.size < 2}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#006B3F' }}
          >
            Next: Review <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  /* Step 3 — Confirm */
  return (
    <div className="flex h-full flex-col px-4">
      <div className="flex-1 py-4">
        <div
          className="space-y-4 rounded-2xl border p-5"
          style={{ borderColor: 'var(--color-border-1)', backgroundColor: 'var(--color-surface-1)' }}
        >
          {/* Group name */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Group Name
            </p>
            <p className="mt-0.5 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {groupName}
            </p>
          </div>

          {/* Classification */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Classification
            </p>
            <span
              className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{
                backgroundColor:
                  CLASSIFICATION_OPTIONS.find((o) => o.value === classification)?.color ?? '#006B3F',
              }}
            >
              {classification}
            </span>
          </div>

          {/* Ministry tag */}
          {ministryTag && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Ministry / Department
              </p>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {ministryTag}
              </p>
            </div>
          )}

          {/* Members */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Members ({selectedStaff.length})
            </p>
            <div className="mt-2 space-y-1.5">
              {selectedStaff.map((u) => (
                <div key={u.userId} className="flex items-center gap-2">
                  <InitialsAvatar name={u.displayName} isOnline={u.isOnline} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {u.displayName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {u.ministry}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pb-4 pt-2">
        <button
          type="button"
          onClick={() => setStep('members')}
          className="flex items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={handleCreate}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#006B3F' }}
        >
          <Users size={16} /> Create Group
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function ContactPickerView({ mode, onClose }: ContactPickerViewProps) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {mode === 'dm' ? 'New Direct Message' : 'Create Group'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors hover:brightness-90"
          style={{ backgroundColor: 'var(--color-surface-2)' }}
        >
          <X size={18} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden pt-3">
        {mode === 'dm' ? <DMPicker onClose={onClose} /> : <GroupPicker onClose={onClose} />}
      </div>
    </div>
  );
}
