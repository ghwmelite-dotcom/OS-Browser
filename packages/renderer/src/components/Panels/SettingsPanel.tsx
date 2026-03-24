import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Check, Globe } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';
import { useProfileStore } from '@/store/profile';
import { AvatarPicker } from '@/components/shared/AvatarPicker';

// Auto-save toast
function SaveIndicator({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg z-[200] animate-fade-up"
      style={{ background: 'var(--color-accent)', color: '#fff' }}>
      <Check size={14} />
      <span className="text-[13px] font-medium">Saved automatically</span>
    </div>
  );
}

// Default browser section — lets users set OS Browser as their system default
function DefaultBrowserSection() {
  const [isDefault, setIsDefault] = useState<boolean | null>(null);
  const [setting, setSetting] = useState(false);

  useEffect(() => {
    (window as any).osBrowser?.app?.isDefaultBrowser?.().then((res: any) => {
      setIsDefault(res?.isDefault ?? false);
    }).catch(() => setIsDefault(false));
  }, []);

  const handleSetDefault = async () => {
    setSetting(true);
    try {
      await (window as any).osBrowser?.app?.setDefaultBrowser?.();
      // Re-check after a short delay (user may need to confirm in Windows Settings)
      setTimeout(async () => {
        const res = await (window as any).osBrowser?.app?.isDefaultBrowser?.();
        setIsDefault(res?.isDefault ?? false);
        setSetting(false);
      }, 2000);
    } catch {
      setSetting(false);
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-accent)' }}>Default Browser</h3>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}>
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Globe size={18} style={{ color: 'var(--color-accent)' }} />
            <div>
              <span className="text-[14px] text-text-primary font-medium">Default Web Browser</span>
              <p className="text-[12px] text-text-muted mt-0.5">
                {isDefault === null ? 'Checking...' : isDefault ? 'OS Browser is your default browser' : 'OS Browser is not your default browser'}
              </p>
            </div>
          </div>
          {isDefault ? (
            <span className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
              <Check size={14} /> Default
            </span>
          ) : (
            <button
              onClick={handleSetDefault}
              disabled={setting || isDefault === null}
              className="text-[12px] font-medium px-4 py-2 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
              {setting ? 'Opening Settings...' : 'Set as Default'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Full settings page rendered inside a tab
export function SettingsPage() {
  const { settings, isLoaded, updateSettings, loadSettings } = useSettingsStore();
  const profile = useProfileStore();
  const [profileName, setProfileName] = useState(profile.displayName);
  const [profileEmail, setProfileEmail] = useState(profile.email);
  const [profileSaved, setProfileSaved] = useState(false);
  const [saveShow, setSaveShow] = useState(false);

  // Sync local state if profile store changes externally
  useEffect(() => {
    setProfileName(profile.displayName);
    setProfileEmail(profile.email);
  }, [profile.displayName, profile.email]);

  useEffect(() => {
    // Only load if not already loaded
    if (!settings) loadSettings();
  }, []);

  const autoSave = useCallback(async (data: Record<string, any>) => {
    await updateSettings(data);
    setSaveShow(true);
    setTimeout(() => setSaveShow(false), 1500);
  }, [updateSettings]);

  useEffect(() => {
    if (!settings && !isLoaded) {
      const timer = setTimeout(() => loadSettings(), 200);
      return () => clearTimeout(timer);
    }
  }, [settings, isLoaded]);

  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        <div className="text-center">
          <p className="text-[14px] mb-2">Loading settings...</p>
          <button onClick={() => loadSettings()} className="text-[12px] underline" style={{ color: 'var(--color-accent)' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s = settings as any;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
      <h3 className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-accent)' }}>{title}</h3>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-between px-5 py-3.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border-1)' }}>
      {children}
    </div>
  );

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) => (
    <Row>
      <div className="flex-1 mr-4">
        <span className="text-[14px] text-text-primary font-medium">{label}</span>
        {desc && <p className="text-[12px] text-text-muted mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className="w-11 h-6 rounded-full transition-all relative shrink-0"
        style={{ background: value ? 'var(--color-accent)' : 'var(--color-border-2)' }}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </Row>
  );

  const Select = ({ label, desc, value, options, onChange }: {
    label: string; desc?: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
  }) => (
    <Row>
      <div className="flex-1 mr-4">
        <span className="text-[14px] text-text-primary font-medium">{label}</span>
        {desc && <p className="text-[12px] text-text-muted mt-0.5">{desc}</p>}
      </div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-[13px] outline-none border transition-colors cursor-pointer shrink-0"
        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Row>
  );

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[680px] mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)', color: '#fff' }}>
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Settings</h1>
            <p className="text-[12px] text-text-muted">Changes are saved automatically</p>
          </div>
        </div>

        {/* ── Profile ── */}
        <Section title="Profile">
          <div className="px-5 py-4 flex items-center gap-5 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
            <AvatarPicker
              currentAvatar={profile.avatarUrl || undefined}
              displayName={profileName || 'User'}
              size={72}
              onAvatarChange={(url) => {
                useProfileStore.getState().setAvatar(url);
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text-primary truncate">
                {profileName || 'No name set'}
              </p>
              <p className="text-[12px] text-text-muted truncate">
                {profileEmail || 'No email set'}
              </p>
              {profile.department && (
                <p className="text-[11px] text-text-muted mt-0.5 truncate">
                  {profile.department}
                </p>
              )}
            </div>
          </div>
          <Row>
            <div className="flex-1 mr-4">
              <label className="text-[14px] text-text-primary font-medium" htmlFor="profile-name">Display Name</label>
              <p className="text-[12px] text-text-muted mt-0.5">How your name appears across the browser</p>
            </div>
            <input
              id="profile-name"
              type="text"
              value={profileName}
              onChange={e => { setProfileName(e.target.value); setProfileSaved(false); }}
              placeholder="Enter your name"
              className="px-3 py-1.5 rounded-lg text-[13px] outline-none border transition-colors w-[200px] shrink-0"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
            />
          </Row>
          <Row>
            <div className="flex-1 mr-4">
              <label className="text-[14px] text-text-primary font-medium" htmlFor="profile-email">Email</label>
              <p className="text-[12px] text-text-muted mt-0.5">Your government email address</p>
            </div>
            <input
              id="profile-email"
              type="email"
              value={profileEmail}
              onChange={e => { setProfileEmail(e.target.value); setProfileSaved(false); }}
              placeholder="you@gov.gh"
              className="px-3 py-1.5 rounded-lg text-[13px] outline-none border transition-colors w-[200px] shrink-0"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
            />
          </Row>
          {profile.staffId && (
            <Row>
              <div className="flex-1">
                <span className="text-[14px] text-text-primary font-medium">Staff ID</span>
              </div>
              <span className="text-[13px] text-text-muted">{profile.staffId}</span>
            </Row>
          )}
          {profile.department && (
            <Row>
              <div className="flex-1">
                <span className="text-[14px] text-text-primary font-medium">Department</span>
              </div>
              <span className="text-[13px] text-text-muted">{profile.department}</span>
            </Row>
          )}
          {profile.ministry && (
            <Row>
              <div className="flex-1">
                <span className="text-[14px] text-text-primary font-medium">Ministry</span>
              </div>
              <span className="text-[13px] text-text-muted">{profile.ministry}</span>
            </Row>
          )}
          <div className="px-5 py-3 flex justify-end">
            <button
              onClick={() => {
                useProfileStore.getState().setProfile({ displayName: profileName, email: profileEmail });
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 2000);
              }}
              disabled={profileName === profile.displayName && profileEmail === profile.email}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={{
                background: profileSaved ? '#006B3F' : 'var(--color-accent)',
                color: '#fff',
                opacity: (profileName === profile.displayName && profileEmail === profile.email) ? 0.5 : 1,
                cursor: (profileName === profile.displayName && profileEmail === profile.email) ? 'not-allowed' : 'pointer',
              }}
            >
              {profileSaved ? (
                <span className="flex items-center gap-1.5"><Check size={14} /> Saved</span>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </Section>

        <Section title="On Startup">
          <Select label="When OS Browser opens" desc="Choose what happens when you launch the browser"
            value={s.startup_mode || 'newtab'}
            options={[
              { value: 'newtab', label: 'Open the New Tab page' },
              { value: 'restore', label: 'Continue where you left off' },
            ]}
            onChange={v => autoSave({ startup_mode: v })} />
        </Section>

        <Section title="Appearance">
          <Select label="Theme" desc="Controls the browser's color scheme"
            value={s.theme}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System default' }]}
            onChange={v => {
              autoSave({ theme: v });
              document.documentElement.classList.toggle('dark', v === 'dark');
              document.documentElement.classList.toggle('light', v !== 'dark');
            }} />
          <Select label="Sidebar Position" desc="Which side the AI assistant appears on"
            value={s.sidebar_position}
            options={[{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }]}
            onChange={v => autoSave({ sidebar_position: v })} />
        </Section>

        <Section title="Privacy & Security">
          <Toggle label="Privacy Mode" desc="No history, cache, or logs recorded while active"
            value={!!s.privacy_mode} onChange={v => autoSave({ privacy_mode: v })} />
          <Toggle label="Ad Blocking" desc="Block ads, trackers, and malware at the network level"
            value={!!s.ad_blocking} onChange={v => autoSave({ ad_blocking: v })} />
        </Section>

        <Section title="Search">
          <Select label="Default Search Engine" desc="Used when typing search terms in the address bar"
            value={s.search_engine}
            options={[
              { value: 'osbrowser', label: 'OS Browser AI' },
              { value: 'google', label: 'Google' },
              { value: 'duckduckgo', label: 'DuckDuckGo' },
              { value: 'bing', label: 'Bing' },
            ]}
            onChange={v => autoSave({ search_engine: v })} />
        </Section>

        <Section title="AI Assistant">
          <Select label="Default AI Model" desc="The AI model used for chat, summarization, and translation"
            value={s.default_model}
            options={[
              { value: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B (Default)' },
              { value: '@cf/meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Fast)' },
              { value: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1 (Code & Math)' },
              { value: '@cf/mistral/mistral-small-3.1-24b-instruct', label: 'Mistral Small (Chat)' },
              { value: '@cf/qwen/qwen2.5-72b-instruct', label: 'Qwen 2.5 72B (Multilingual)' },
              { value: '@hf/google/gemma-7b-it', label: 'Gemma 7B (Lightweight)' },
            ]}
            onChange={v => autoSave({ default_model: v })} />
        </Section>

        <Section title="Language">
          <Select label="Browser Language" desc="The language used for the browser interface"
            value={s.language}
            options={[{ value: 'en', label: 'English' }, { value: 'tw', label: 'Twi (Akan)' }]}
            onChange={v => autoSave({ language: v })} />
        </Section>

        <DefaultBrowserSection />

        <Section title="About">
          <Row>
            <div>
              <span className="text-[14px] text-text-primary font-medium">OS Browser</span>
              <p className="text-[12px] text-text-muted mt-0.5">Version 1.0.0 — Ghana's AI-Powered Browser</p>
            </div>
            <span className="text-[12px] text-text-muted">Designed & Developed by Osborn Hodges | Powered by RSIMD(OHCS)</span>
          </Row>
        </Section>
      </div>

      <SaveIndicator show={saveShow} />
    </div>
  );
}

// Overlay wrapper — opens settings in a new tab instead
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    // Check if a settings tab already exists — switch to it instead of creating duplicate
    import('@/store/tabs').then(({ useTabsStore }) => {
      const { tabs, switchTab, createTab } = useTabsStore.getState();
      const existingSettings = tabs.find(t => t.url === 'os-browser://settings');
      if (existingSettings) {
        switchTab(existingSettings.id);
      } else {
        createTab('os-browser://settings');
      }
      onClose();
    });
  }, [onClose]);
  return null;
}
