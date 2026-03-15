import React from 'react';
import { Sparkles, FileText, FormInput, ShieldCheck, BookOpen, MessageSquare, ChevronRight } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

const AI_QUICK_ACTIONS = [
  {
    label: 'Explain this page',
    desc: 'Get an AI summary and explanation of the current page',
    icon: FileText,
    event: 'os-browser:ai-explain',
  },
  {
    label: 'Help with form',
    desc: 'AI guidance for completing the current form',
    icon: FormInput,
    event: 'os-browser:ai-fill-form',
  },
  {
    label: 'Check site safety',
    desc: 'AI safety analysis of the current website',
    icon: ShieldCheck,
    event: 'os-browser:ai-safety',
  },
  {
    label: 'Show tutorials',
    desc: 'View guided tutorials for browser features',
    icon: BookOpen,
    event: 'os-browser:ai-tutorials',
  },
  {
    label: 'Ask a question',
    desc: 'Ask the AI assistant anything',
    icon: MessageSquare,
    event: 'os-browser:ai-ask',
  },
];

const dispatchAI = (eventName: string) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

// ── Sidebar Panel ───────────────────────────────────────────────────
const AIAssistantPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border-1)',
      },
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement(Sparkles, { size: 16, style: { color: stripColor } }),
        React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'AI Assistant'),
      ),
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

    // Description
    React.createElement('div', {
      style: { padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' },
    }, 'Ask questions, get help with forms, verify site safety, and access tutorials.'),

    // Quick actions
    React.createElement('div', {
      style: { flex: 1, overflowY: 'auto' as const, padding: '0 8px' },
    },
      ...AI_QUICK_ACTIONS.map(action =>
        React.createElement('button', {
          key: action.label,
          onClick: () => dispatchAI(action.event),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 8px',
            margin: '2px 0',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--color-text-primary)',
            textAlign: 'left' as const,
            fontSize: '13px',
            fontFamily: 'inherit',
          },
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'var(--color-surface-2)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          },
        },
          React.createElement('div', {
            style: {
              width: 36, height: 36,
              borderRadius: '10px',
              background: `${stripColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            },
          }, React.createElement(action.icon, { size: 18, style: { color: stripColor } })),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 500, fontSize: '13px' } }, action.label),
            React.createElement('div', { style: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' } }, action.desc),
          ),
          React.createElement(ChevronRight, { size: 14, style: { color: 'var(--color-text-muted)', flexShrink: 0 } }),
        ),
      ),
    ),
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
        action: () => dispatchAI('os-browser:ai-explain'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:fill-form',
        label: 'Help me fill this form',
        description: 'AI guidance for completing the current form',
        keywords: ['form', 'fill', 'help', 'guide', 'complete', 'input', 'fields'],
        action: () => dispatchAI('os-browser:ai-fill-form'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:safety',
        label: 'Is this site safe?',
        description: 'AI safety analysis of the current website',
        keywords: ['safe', 'safety', 'secure', 'scam', 'phishing', 'trust', 'verify', 'check'],
        action: () => dispatchAI('os-browser:ai-safety'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:tutorials',
        label: 'Show tutorials',
        description: 'View guided tutorials for browser features',
        keywords: ['tutorials', 'guide', 'learn', 'how', 'help', 'walkthrough', 'onboarding'],
        action: () => dispatchAI('os-browser:ai-tutorials'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:ask',
        label: 'Ask a question',
        description: 'Ask the AI assistant anything',
        keywords: ['ask', 'question', 'ai', 'assistant', 'help', 'chat', 'ozzy'],
        action: () => dispatchAI('os-browser:ai-ask'),
        group: 'AI Assistant',
      },
    ],
  },
};

FeatureRegistry.register(aiAssistantFeature);

export default aiAssistantFeature;
