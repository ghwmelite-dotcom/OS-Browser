import React from 'react';
import { X, Settings } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useSettingsStore();
  if (!settings) return null;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-b border-border-1 px-4 py-4"><h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">{title}</h3>{children}</div>
  );

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-md text-text-primary">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-ghana-gold' : 'bg-border-2'} relative focus:outline-none focus:ring-2 focus:ring-ghana-gold`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );

  const Select = ({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-md text-text-primary">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="bg-surface-2 text-sm text-text-primary rounded-btn px-2 py-1 outline-none focus:ring-2 focus:ring-ghana-gold border border-border-1">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-16">
      <div className="w-[520px] max-h-[80vh] bg-surface-1 border border-border-1 rounded-card shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
          <div className="flex items-center gap-2"><Settings size={16} className="text-ghana-gold" /><span className="text-md font-medium">Settings</span></div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold"><X size={16} className="text-text-muted" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Section title="Appearance">
            <Select label="Theme" value={settings.theme} options={[{value:'dark',label:'Dark'},{value:'light',label:'Light'},{value:'system',label:'System'}]} onChange={v => updateSettings({theme: v as any})} />
            <Select label="Sidebar Position" value={settings.sidebar_position} options={[{value:'right',label:'Right'},{value:'left',label:'Left'}]} onChange={v => updateSettings({sidebar_position: v as any})} />
          </Section>
          <Section title="Privacy & Security">
            <Toggle label="Privacy Mode" value={settings.privacy_mode} onChange={v => updateSettings({privacy_mode: v})} />
            <Toggle label="Ad Blocking" value={settings.ad_blocking} onChange={v => updateSettings({ad_blocking: v})} />
          </Section>
          <Section title="Search">
            <Select label="Search Engine" value={settings.search_engine} options={[{value:'osbrowser',label:'OS Browser AI'},{value:'google',label:'Google'},{value:'duckduckgo',label:'DuckDuckGo'},{value:'bing',label:'Bing'}]} onChange={v => updateSettings({search_engine: v})} />
          </Section>
          <Section title="AI">
            <Select label="Default Model" value={settings.default_model} options={[
              {value:'@cf/meta/llama-3.3-70b-instruct-fp8-fast',label:'Llama 3.3 70B'},
              {value:'@cf/meta/llama-3.1-8b-instruct',label:'Llama 3.1 8B'},
              {value:'@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',label:'DeepSeek R1'},
              {value:'@cf/mistral/mistral-small-3.1-24b-instruct',label:'Mistral Small'},
              {value:'@cf/qwen/qwen2.5-72b-instruct',label:'Qwen 2.5 72B'},
              {value:'@hf/google/gemma-7b-it',label:'Gemma 7B'},
            ]} onChange={v => updateSettings({default_model: v})} />
          </Section>
          <Section title="Language">
            <Select label="Language" value={settings.language} options={[{value:'en',label:'English'},{value:'tw',label:'Twi (Akan)'}]} onChange={v => updateSettings({language: v})} />
          </Section>
        </div>
      </div>
      <div className="fixed inset-0 bg-black/50 -z-10" onClick={onClose} />
    </div>
  );
}
