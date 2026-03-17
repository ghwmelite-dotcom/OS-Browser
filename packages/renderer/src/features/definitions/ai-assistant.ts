import React, { useRef, useEffect } from 'react';
import { Sparkles, FileText, FormInput, ShieldCheck, BookOpen, MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';
import { useAIStore } from '@/store/ai';

const AI_QUICK_ACTIONS = [
  {
    label: 'Explain this page',
    desc: 'Get an AI summary and explanation of the current page',
    icon: FileText,
    prompt: 'Please explain the content of the current page I\'m viewing',
  },
  {
    label: 'Help with form',
    desc: 'AI guidance for completing the current form',
    icon: FormInput,
    prompt: 'Help me fill out forms on this page',
  },
  {
    label: 'Check site safety',
    desc: 'AI safety analysis of the current website',
    icon: ShieldCheck,
    prompt: 'Check this page for security risks and suspicious content',
  },
  {
    label: 'Show tutorials',
    desc: 'View guided tutorials for browser features',
    icon: BookOpen,
    prompt: 'Show me tutorials relevant to what I\'m doing',
  },
  {
    label: 'Ask a question',
    desc: 'Ask the AI assistant anything',
    icon: MessageSquare,
    prompt: '',
  },
];

const sendToAI = (prompt: string) => {
  if (prompt) {
    useAIStore.getState().sendMessage(prompt);
  }
};

// ── Sidebar Panel ───────────────────────────────────────────────────
const AIAssistantPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  const messages = useAIStore((s) => s.messages);
  const isStreaming = useAIStore((s) => s.isStreaming);
  const clearMessages = useAIStore((s) => s.clearMessages);
  const [inputValue, setInputValue] = React.useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recentMessages = messages.slice(-20);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    useAIStore.getState().sendMessage(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (!prompt) {
      inputRef.current?.focus();
      return;
    }
    sendToAI(prompt);
  };

  return React.createElement('div', {
    style: {
      width,
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      borderLeft: `3px solid ${stripColor}`,
      background: 'var(--color-surface-1)',
      color: 'var(--color-text-primary)',
    },
  },
    // Header
    React.createElement('div', {
      style: {
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border-1)',
        flexShrink: 0,
      },
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement(Sparkles, { size: 16, style: { color: stripColor } }),
        React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'AI Assistant'),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
        messages.length > 0
          ? React.createElement('button', {
              onClick: clearMessages,
              title: 'Clear chat',
              style: {
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              },
            }, React.createElement(Trash2, { size: 14 }))
          : null,
        React.createElement('button', {
          onClick: onClose,
          style: {
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            padding: '4px',
            borderRadius: '4px',
          },
        }, '\u00D7'),
      ),
    ),

    // Quick actions (compact row)
    React.createElement('div', {
      style: {
        padding: '8px',
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '4px',
        borderBottom: '1px solid var(--color-border-1)',
        flexShrink: 0,
      },
    },
      ...AI_QUICK_ACTIONS.map(action =>
        React.createElement('button', {
          key: action.label,
          onClick: () => handleQuickAction(action.prompt),
          disabled: isStreaming && !!action.prompt,
          title: action.desc,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
            borderRadius: '16px',
            cursor: isStreaming && action.prompt ? 'not-allowed' : 'pointer',
            color: 'var(--color-text-primary)',
            fontSize: '11px',
            fontFamily: 'inherit',
            opacity: isStreaming && action.prompt ? 0.5 : 1,
            transition: 'background 0.15s ease',
          },
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isStreaming || !action.prompt) {
              e.currentTarget.style.background = `${stripColor}22`;
            }
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'var(--color-surface-2)';
          },
        },
          React.createElement(action.icon, { size: 12, style: { color: stripColor, flexShrink: 0 } }),
          action.label,
        ),
      ),
    ),

    // Chat area
    React.createElement('div', {
      style: {
        flex: 1,
        overflowY: 'auto' as const,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
      },
    },
      recentMessages.length === 0
        ? React.createElement('div', {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
              textAlign: 'center' as const,
              padding: '24px 16px',
              gap: '8px',
            },
          },
            React.createElement(Sparkles, { size: 24, style: { color: stripColor, opacity: 0.5 } }),
            'Tap a quick action above or type a message to get started.',
          )
        : null,
      ...recentMessages.map((msg) =>
        React.createElement('div', {
          key: msg.id,
          style: {
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          },
        },
          React.createElement('div', {
            style: {
              maxWidth: '85%',
              padding: '8px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user' ? stripColor : 'var(--color-surface-2)',
              color: msg.role === 'user' ? '#1a1a1a' : 'var(--color-text-primary)',
              fontSize: '12px',
              lineHeight: '1.5',
              wordBreak: 'break-word' as const,
              whiteSpace: 'pre-wrap' as const,
            },
          }, msg.content),
        ),
      ),
      // Streaming indicator
      isStreaming
        ? React.createElement('div', {
            style: {
              display: 'flex',
              justifyContent: 'flex-start',
            },
          },
            React.createElement('div', {
              style: {
                padding: '8px 12px',
                borderRadius: '12px 12px 12px 2px',
                background: 'var(--color-surface-2)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-text-muted)',
              },
            },
              React.createElement(Loader2, {
                size: 12,
                style: {
                  animation: 'spin 1s linear infinite',
                },
              }),
              'Thinking...',
            ),
          )
        : null,
      React.createElement('div', { ref: chatEndRef }),
    ),

    // Input area
    React.createElement('div', {
      style: {
        padding: '8px 12px',
        borderTop: '1px solid var(--color-border-1)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexShrink: 0,
      },
    },
      React.createElement('input', {
        ref: inputRef,
        type: 'text',
        value: inputValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value),
        onKeyDown: handleKeyDown,
        placeholder: 'Ask anything...',
        disabled: isStreaming,
        style: {
          flex: 1,
          padding: '8px 12px',
          borderRadius: '20px',
          border: '1px solid var(--color-border-1)',
          background: 'var(--color-surface-2)',
          color: 'var(--color-text-primary)',
          fontSize: '12px',
          fontFamily: 'inherit',
          outline: 'none',
        },
      }),
      React.createElement('button', {
        onClick: handleSend,
        disabled: !inputValue.trim() || isStreaming,
        style: {
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          background: inputValue.trim() && !isStreaming ? stripColor : 'var(--color-surface-2)',
          color: inputValue.trim() && !isStreaming ? '#1a1a1a' : 'var(--color-text-muted)',
          cursor: inputValue.trim() && !isStreaming ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s ease',
        },
      }, React.createElement(Send, { size: 14 })),
    ),

    // Inline keyframe for spinner
    React.createElement('style', {}, `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const aiAssistantFeature = {
  id: 'ai-assistant',
  name: 'AI Assistant',
  description: 'AI-powered help for page comprehension, form filling, safety checks, and tutorials.',
  stripColor: '#FCD116',
  icon: Sparkles,
  category: 'intelligence' as const,
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: AIAssistantPanel,
      order: 4,
      defaultPanelWidth: 340,
    },
    commandBar: [
      {
        id: 'ai-assistant:explain',
        label: 'Explain this page',
        description: 'Get an AI summary and explanation of the current page',
        keywords: ['explain', 'page', 'summary', 'understand', 'what', 'about', 'read'],
        action: () => sendToAI('Please explain the content of the current page I\'m viewing'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:fill-form',
        label: 'Help me fill this form',
        description: 'AI guidance for completing the current form',
        keywords: ['form', 'fill', 'help', 'guide', 'complete', 'input', 'fields'],
        action: () => sendToAI('Help me fill out forms on this page'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:safety',
        label: 'Is this site safe?',
        description: 'AI safety analysis of the current website',
        keywords: ['safe', 'safety', 'secure', 'scam', 'phishing', 'trust', 'verify', 'check'],
        action: () => sendToAI('Check this page for security risks and suspicious content'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:tutorials',
        label: 'Show tutorials',
        description: 'View guided tutorials for browser features',
        keywords: ['tutorials', 'guide', 'learn', 'how', 'help', 'walkthrough', 'onboarding'],
        action: () => sendToAI('Show me tutorials relevant to what I\'m doing'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:ask',
        label: 'Ask a question',
        description: 'Ask the AI assistant anything',
        keywords: ['ask', 'question', 'ai', 'assistant', 'help', 'chat', 'ozzy'],
        action: () => sendToAI(''),
        group: 'AI Assistant',
      },
    ],
  },
};

FeatureRegistry.register(aiAssistantFeature);

export default aiAssistantFeature;
