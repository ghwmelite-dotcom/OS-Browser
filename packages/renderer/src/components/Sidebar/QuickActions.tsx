import React from 'react';
import { FileText, Languages, Code, GitCompare } from 'lucide-react';
import { useAIStore } from '@/store/ai';

export function QuickActions() {
  const { sendMessage } = useAIStore();
  const actions = [
    { icon: FileText, label: 'Summarize', prompt: 'Summarize the current page' },
    { icon: Languages, label: 'Translate', prompt: 'Translate the page content to Twi' },
    { icon: Code, label: 'Explain Code', prompt: 'Explain any code on this page' },
    { icon: GitCompare, label: 'Compare', prompt: 'Compare the key options discussed on this page' },
  ];

  return (
    <div className="flex gap-2 px-4 py-2 border-b border-border-1 overflow-x-auto">
      {actions.map(action => (
        <button key={action.label} onClick={() => sendMessage(action.prompt)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ghana-gold/30 text-xs text-ghana-gold hover:bg-ghana-gold-dim transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ghana-gold">
          <action.icon size={12} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
