import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev';

interface AskOzzyTabProps {
  colors: Record<string, string>;
}

export function AskOzzyTab({ colors }: AskOzzyTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data?.response || data?.result?.response || 'Sorry, I could not process that request.';
      setMessages(prev => [...prev, { id: String(Date.now()), role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        id: String(Date.now()), role: 'assistant',
        content: 'Unable to connect. Please check your internet connection.',
      }]);
    }
    setIsLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: colors.surface1,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${colors.accent}, #60A5FA)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>AskOzzy</div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>AI-powered assistant</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <Sparkles size={40} style={{ color: colors.accent, margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: colors.text, marginBottom: 8 }}>
              Hi! I'm Ozzy
            </h3>
            <p style={{ fontSize: 13, color: colors.textMuted, maxWidth: 280, margin: '0 auto' }}>
              Your AI assistant. Ask me anything — from government services to general knowledge.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
            background: msg.role === 'user' ? colors.accent : colors.surface2,
            color: msg.role === 'user' ? '#fff' : colors.text,
            fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
            borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
          }}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 16,
            background: colors.surface2, color: colors.textMuted,
            fontSize: 14, borderBottomLeftRadius: 4,
          }}>
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: colors.surface1,
        borderTop: `1px solid ${colors.border}`,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Ask Ozzy anything..."
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 20,
            border: `1px solid ${colors.border}`, background: colors.surface2,
            color: colors.text, fontSize: 14, outline: 'none',
          }}
        />
        <button onClick={handleSend} disabled={isLoading} style={{
          width: 40, height: 40, borderRadius: '50%', border: 'none',
          background: isLoading ? colors.surface2 : colors.accent,
          color: '#fff', cursor: isLoading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
