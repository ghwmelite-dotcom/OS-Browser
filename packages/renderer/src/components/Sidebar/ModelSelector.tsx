import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAIStore } from '@/store/ai';

const MODELS = [
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B', provider: 'Meta' },
  { id: '@cf/meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B', provider: 'Meta' },
  { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: '@cf/mistral/mistral-small-3.1-24b-instruct', label: 'Mistral Small', provider: 'Mistral' },
  { id: '@cf/qwen/qwen2.5-72b-instruct', label: 'Qwen 2.5 72B', provider: 'Alibaba' },
  { id: '@hf/google/gemma-7b-it', label: 'Gemma 7B', provider: 'Google' },
];

export function ModelSelector() {
  const { selectedModel, setModel } = useAIStore();
  const [isOpen, setIsOpen] = useState(false);
  const current = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  return (
    <div className="relative px-4 py-2 border-b border-border-1">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-1.5 rounded-btn bg-surface-2 hover:bg-surface-3 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-ghana-gold">
        <span className="text-text-primary">{current.label} <span className="text-text-muted">· {current.provider}</span></span>
        <ChevronDown size={14} className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-surface-2 border border-border-1 rounded-card shadow-lg z-50 overflow-hidden">
          {MODELS.map(model => (
            <button key={model.id} onClick={() => { setModel(model.id); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition-colors ${model.id === selectedModel ? 'text-ghana-gold bg-ghana-gold-dim' : 'text-text-primary'}`}>
              {model.label} <span className="text-text-muted">· {model.provider}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
