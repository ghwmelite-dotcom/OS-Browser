import React, { useEffect, useState } from 'react';
import { Plus, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { useProfileStore, type ProfilePublic } from '@/store/profiles';
import { PinEntry } from './PinEntry';
import { CreateProfileForm } from './CreateProfileForm';

interface ProfileLauncherProps {
  onProfileReady: () => void;
}

export function ProfileLauncher({ onProfileReady }: ProfileLauncherProps) {
  const { profiles, loadProfiles, switchProfile } = useProfileStore();
  const [selectedProfile, setSelectedProfile] = useState<ProfilePublic | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [menuProfileId, setMenuProfileId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; pin: string } | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProfiles().then(() => setLoaded(true));
  }, []);

  // If no profiles exist, show create form directly
  const isFirstProfile = loaded && profiles.length === 0;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleProfileClick = (profile: ProfilePublic) => {
    setMenuProfileId(null);
    setSelectedProfile(profile);
  };

  const handlePinVerified = async () => {
    if (!selectedProfile) return;
    const ok = await switchProfile(selectedProfile.id);
    if (ok) {
      onProfileReady();
    }
  };

  const handleProfileCreated = async (profile: any) => {
    // After creation, switch to the new profile
    const ok = await switchProfile(profile.id);
    if (ok) {
      onProfileReady();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    if (!/^\d{4}$/.test(deletePin)) {
      setDeleteError('Enter your 4-digit PIN');
      return;
    }
    const ok = await useProfileStore.getState().deleteProfile(deleteConfirm.id, deletePin);
    if (ok) {
      setDeleteConfirm(null);
      setDeletePin('');
      setDeleteError('');
      loadProfiles();
    } else {
      setDeleteError('Wrong PIN');
      setDeletePin('');
    }
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuProfileId) return;
    const handler = () => setMenuProfileId(null);
    setTimeout(() => window.addEventListener('click', handler), 0);
    return () => window.removeEventListener('click', handler);
  }, [menuProfileId]);

  if (!loaded) {
    return (
      <div className="fixed inset-0 z-[350] flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}>
        <div className="animate-pulse text-text-muted text-[14px]">Loading...</div>
      </div>
    );
  }

  // PIN entry overlay
  if (selectedProfile) {
    return (
      <PinEntry
        profile={selectedProfile}
        onVerified={handlePinVerified}
        onCancel={() => setSelectedProfile(null)}
      />
    );
  }

  // Delete confirmation overlay
  if (deleteConfirm) {
    const profileToDelete = profiles.find(p => p.id === deleteConfirm.id);
    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
        <div className="w-[calc(100%-2rem)] max-w-[360px] rounded-2xl border shadow-2xl p-6"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#e53e3e' }}>
              <Trash2 size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-text-primary">Delete Profile</h3>
              <p className="text-[12px] text-text-muted">
                Delete "{profileToDelete?.name}"? This removes all browsing data.
              </p>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
              Enter PIN to confirm
            </label>
            <input
              type="password"
              value={deletePin}
              onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) { setDeletePin(e.target.value); setDeleteError(''); } }}
              onKeyDown={e => { if (e.key === 'Enter') handleDelete(); }}
              placeholder="4-digit PIN"
              autoFocus
              maxLength={4}
              inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-xl text-[14px] text-center tracking-[0.3em] font-mono outline-none border"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {deleteError && <p className="text-[12px] text-red-500 text-center mb-3">{deleteError}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => { setDeleteConfirm(null); setDeletePin(''); setDeleteError(''); }}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all border"
              style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deletePin.length !== 4}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: '#e53e3e' }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[350] flex flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Kente crown */}
      <div style={{
        height: 3,
        background: 'var(--kente-crown)',
        flexShrink: 0,
      }} />

      {/* Draggable title bar area */}
      <div className="h-8 shrink-0 flex items-center px-3"
        style={{ WebkitAppRegion: 'drag', background: 'var(--kente-header-bg)' } as React.CSSProperties}>
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-accent)' }}>
          OS Browser
        </span>
        <div className="flex-1" />
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex h-full">
          <button onClick={() => window.osBrowser?.minimize()} className="w-11 h-full flex items-center justify-center hover:bg-surface-2 transition-colors" aria-label="Minimize">
            <svg width="10" height="1"><rect width="10" height="1" fill="currentColor" className="text-text-secondary" /></svg>
          </button>
          <button onClick={() => window.osBrowser?.close()} className="w-11 h-full flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors group" aria-label="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-text-secondary group-hover:text-white">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content — centered */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
        {isFirstProfile || showCreate ? (
          <div className="w-full max-w-[440px]">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
                <svg className="w-8 h-8" viewBox="0 0 512 512">
                  <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" opacity=".95"/>
                </svg>
              </div>
            </div>

            <CreateProfileForm
              onCreated={handleProfileCreated}
              onCancel={isFirstProfile ? undefined : () => setShowCreate(false)}
              isFirstProfile={isFirstProfile}
            />
          </div>
        ) : (
          <div className="w-full max-w-[520px]">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
                <svg className="w-7 h-7" viewBox="0 0 512 512">
                  <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" opacity=".95"/>
                </svg>
              </div>
            </div>

            {/* Ghana flag stripe */}
            <div className="flex h-0.5 rounded-full overflow-hidden mb-5 mx-auto max-w-[120px]">
              <div className="flex-1" style={{ background: '#CE1126' }} />
              <div className="flex-1" style={{ background: '#FCD116' }} />
              <div className="flex-1" style={{ background: '#006B3F' }} />
            </div>

            <h1 className="text-[22px] font-bold text-text-primary text-center mb-1">
              Who's using OS Browser?
            </h1>
            <p className="text-[13px] text-text-muted text-center mb-6">
              Select your profile to continue.
            </p>

            {/* Profile grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 max-h-[60vh] overflow-y-auto pr-1">
              {profiles.map(profile => (
                <div key={profile.id} className="relative group">
                  <button
                    onClick={() => handleProfileClick(profile)}
                    className="w-full p-4 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col items-center gap-2.5"
                    style={{
                      background: 'var(--color-surface-1)',
                      borderColor: 'var(--color-border-1)',
                    }}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md overflow-hidden"
                        style={{ background: profile.color }}>
                        {(profile as any).avatarUrl ? (
                          <img src={(profile as any).avatarUrl} alt={profile.name}
                            className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[18px] font-bold text-white">{getInitials(profile.name)}</span>
                        )}
                      </div>
                      {/* Notification badge */}
                      {((profile as any).unreadCount || 0) > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                          style={{
                            background: '#CE1126',
                            border: '2px solid var(--color-surface-1)',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#fff',
                            lineHeight: 1,
                          }}>
                          {(profile as any).unreadCount > 99 ? '99+' : (profile as any).unreadCount}
                        </div>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-text-primary truncate max-w-full">{profile.name}</span>
                  </button>

                  {/* Three-dot menu — visible on hover */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuProfileId(menuProfileId === profile.id ? null : profile.id); }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-2 transition-all"
                      aria-label="Profile options"
                    >
                      <MoreVertical size={14} className="text-text-muted" />
                    </button>

                    {menuProfileId === profile.id && (
                      <>
                        <div className="fixed inset-0 z-[9]" onClick={e => { e.stopPropagation(); setMenuProfileId(null); }} />
                        <div className="absolute top-8 right-0 w-36 rounded-xl border shadow-xl py-1 z-10"
                          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
                          onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setMenuProfileId(null);
                              // Open profile in browser to edit via account settings
                              handleProfileClick(profile);
                            }}
                            className="w-full px-3 py-2 text-left text-[12px] hover:bg-surface-2 transition-colors flex items-center gap-2"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            <Pencil size={12} />
                            Edit Profile
                          </button>
                          {profiles.length > 1 && (
                            <button
                              onClick={() => {
                                setMenuProfileId(null);
                                setDeleteConfirm({ id: profile.id, pin: '' });
                              }}
                              className="w-full px-3 py-2 text-left text-[12px] text-red-500 hover:bg-surface-2 transition-colors flex items-center gap-2"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Add new profile button */}
              {(
                <button
                  onClick={() => setShowCreate(true)}
                  className="p-4 rounded-2xl border-2 border-dashed transition-all duration-200 hover:border-solid flex flex-col items-center justify-center gap-2"
                  style={{ borderColor: 'var(--color-border-2)', minHeight: '120px' }}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed"
                    style={{ borderColor: 'var(--color-border-2)' }}>
                    <Plus size={20} className="text-text-muted" />
                  </div>
                  <span className="text-[12px] font-medium text-text-muted">Add Profile</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
