import React from 'react';
import { Sparkles } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

// ── Sidebar Panel ───────────────────────────────────────────────────
const AIAssistantPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  return React.createElement('div', {
    style: {
      width,
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      borderLeft: `3px solid ${stripColor}`,
      background: 'var(--panel-bg, #1a1a2e)',
      color: 'var(--panel-text, #e0e0e0)',
    },
  },
    React.createElement('div', {
      style: { padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    },
      React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'AI Assistant'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' },
      }, '\u00D7'),
    ),
    React.createElement('div', { style: { padding: '12px 16px', fontSize: '13px', opacity: 0.7 } },
      'Ask questions, get help with forms, verify site safety, and access tutorials.',
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
        action: () => console.log('[AI] Explain page'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:fill-form',
        label: 'Help me fill this form',
        description: 'AI guidance for completing the current form',
        keywords: ['form', 'fill', 'help', 'guide', 'complete', 'input', 'fields'],
        action: () => console.log('[AI] Fill form'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:safety',
        label: 'Is this site safe?',
        description: 'AI safety analysis of the current website',
        keywords: ['safe', 'safety', 'secure', 'scam', 'phishing', 'trust', 'verify', 'check'],
        action: () => console.log('[AI] Safety check'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:tutorials',
        label: 'Show tutorials',
        description: 'View guided tutorials for browser features',
        keywords: ['tutorials', 'guide', 'learn', 'how', 'help', 'walkthrough', 'onboarding'],
        action: () => console.log('[AI] Show tutorials'),
        group: 'AI Assistant',
      },
      {
        id: 'ai-assistant:ask',
        label: 'Ask a question',
        description: 'Ask the AI assistant anything',
        keywords: ['ask', 'question', 'ai', 'assistant', 'help', 'chat', 'ozzy'],
        action: () => console.log('[AI] Ask question'),
        group: 'AI Assistant',
      },
    ],
  },
};

FeatureRegistry.register(aiAssistantFeature);

export default aiAssistantFeature;
