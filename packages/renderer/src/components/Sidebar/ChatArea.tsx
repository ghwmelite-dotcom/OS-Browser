import React, { useRef, useEffect } from 'react';
import { useAIStore } from '@/store/ai';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';

export function ChatArea() {
  const { messages, isStreaming } = useAIStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-text-muted text-sm py-12">
          <p className="mb-2">Ask me anything about the page you're viewing,</p>
          <p>or use the quick actions above.</p>
        </div>
      )}
      {messages.map(msg => msg.role === 'user' ? (
        <UserMessage key={msg.id} content={msg.content} />
      ) : (
        <AIMessage key={msg.id} content={msg.content} model={msg.model} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-1 px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-ghana-gold animate-dot-pulse" style={{ animationDelay: '0s' }} />
          <span className="w-2 h-2 rounded-full bg-ghana-gold animate-dot-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="w-2 h-2 rounded-full bg-ghana-gold animate-dot-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
