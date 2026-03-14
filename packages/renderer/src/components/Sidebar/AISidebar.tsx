import React from 'react';
import { SidebarHeader } from './SidebarHeader';
import { ModelSelector } from './ModelSelector';
import { QuickActions } from './QuickActions';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';

export function AISidebar() {
  return (
    <div className="w-[380px] bg-surface-1 border-l border-border-1 flex flex-col h-full animate-slide-in-right">
      <SidebarHeader />
      <ModelSelector />
      <QuickActions />
      <ChatArea />
      <ChatInput />
    </div>
  );
}
