import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar';

export function SidebarHeader() {
  const { closePanel } = useSidebarStore();
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-ghana-gold" />
        <span className="text-md font-medium text-text-primary">AI Assistant</span>
      </div>
      <button onClick={closePanel} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold" aria-label="Close sidebar">
        <X size={16} className="text-text-muted" />
      </button>
    </div>
  );
}
