import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { useAIStore } from '@/store/ai';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessage, isStreaming } = useAIStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 border-t border-border-1">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI anything..."
          rows={1}
          className="flex-1 resize-none bg-surface-2 text-md text-text-primary rounded-card px-3 py-2 placeholder:text-text-muted outline-none focus:ring-2 focus:ring-ghana-gold border border-transparent focus:border-ghana-gold transition-colors"
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-ghana-gold text-bg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:ring-offset-2 focus:ring-offset-surface-1"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
