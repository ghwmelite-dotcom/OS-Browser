import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquare } from 'lucide-react';

export function AIMessage({ content, model }: { content: string; model: string }) {
  const modelLabel = model.split('/').pop()?.replace(/-instruct.*/, '') || model;
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-ghana-gold/20 flex items-center justify-center shrink-0 mt-1">
        <MessageSquare size={14} className="text-ghana-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="px-3 py-2 rounded-card bg-surface-2 text-md text-text-primary prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <span className="text-xs text-text-muted mt-1 inline-block">{modelLabel}</span>
      </div>
    </div>
  );
}
