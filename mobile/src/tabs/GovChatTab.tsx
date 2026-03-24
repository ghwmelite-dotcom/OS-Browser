import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: number;
}

const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev';

interface GovChatTabProps {
  colors: Record<string, string>;
}

export function GovChatTab({ colors }: GovChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [staffId, setStaffId] = useState(() => localStorage.getItem('govchat-staff-id') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('govchat-staff-id'));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleLogin = () => {
    if (!staffId.trim()) return;
    localStorage.setItem('govchat-staff-id', staffId.trim());
    setIsLoggedIn(true);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: String(Date.now()),
      text: input.trim(),
      sender: 'user',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // For MVP, echo back — full Matrix integration later
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: String(Date.now()),
        text: 'GovChat is being set up for mobile. Your message was received.',
        sender: 'other',
        timestamp: Date.now(),
      }]);
    }, 500);
  };

  if (!isLoggedIn) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: 32,
      }}>
        <div style={{ fontSize: 40 }}>💬</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>GovChat</h2>
        <p style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
          Secure messaging for government workers
        </p>
        <input
          value={staffId}
          onChange={e => setStaffId(e.target.value)}
          placeholder="Enter your Staff ID"
          onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
          style={{
            width: '100%', maxWidth: 280, padding: '12px 16px', borderRadius: 12,
            border: `1px solid ${colors.border}`, background: colors.surface2,
            color: colors.text, fontSize: 15, outline: 'none', textAlign: 'center',
          }}
        />
        <button onClick={handleLogin} style={{
          padding: '12px 32px', borderRadius: 12, border: 'none',
          background: colors.accent, color: '#fff', fontSize: 15,
          fontWeight: 600, cursor: 'pointer',
        }}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: colors.surface1,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: colors.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, fontWeight: 700,
        }}>G</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>GovChat</div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>Staff ID: {staffId}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 40 }}>
            No messages yet. Start a conversation.
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', padding: '10px 14px', borderRadius: 16,
            background: msg.sender === 'user' ? colors.accent : colors.surface2,
            color: msg.sender === 'user' ? '#fff' : colors.text,
            fontSize: 14, lineHeight: 1.5,
            borderBottomRightRadius: msg.sender === 'user' ? 4 : 16,
            borderBottomLeftRadius: msg.sender === 'other' ? 4 : 16,
          }}>
            {msg.text}
          </div>
        ))}
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
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 20,
            border: `1px solid ${colors.border}`, background: colors.surface2,
            color: colors.text, fontSize: 14, outline: 'none',
          }}
        />
        <button onClick={handleSend} style={{
          width: 40, height: 40, borderRadius: '50%', border: 'none',
          background: colors.accent, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
