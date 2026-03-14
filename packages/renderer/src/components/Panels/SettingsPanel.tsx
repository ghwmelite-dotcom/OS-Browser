import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Check } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';

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

// Full settings page rendered inside a tab
export function SettingsPage() {
  const { settings, updateSettings, loadSettings } = useSettingsStore();
  const [saveShow, setSaveShow] = useState(false);

  useEffect(() => {
    // Only load if not already loaded
    if (!settings) loadSettings();
  }, []);

  const autoSave = useCallback(async (data: Record<string, any>) => {
    await updateSettings(data);
    setSaveShow(true);
    setTimeout(() => setSaveShow(false), 1500);
  }, [updateSettings]);

  if (!settings) {
    // Try loading once more after a short delay
    setTimeout(() => loadSettings(), 100);
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

        <Section title="About">
          <Row>
            <div>
              <span className="text-[14px] text-text-primary font-medium">OS Browser</span>
              <p className="text-[12px] text-text-muted mt-0.5">Version 1.0.0 — Ghana's AI-Powered Browser</p>
            </div>
            <span className="text-[12px] text-text-muted">Powered by OHCS</span>
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
