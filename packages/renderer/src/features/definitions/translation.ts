import React from 'react';
import { Languages, Globe } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps } from '../registry';

// ── Status Bar Indicator ────────────────────────────────────────────
const TranslationIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor, onClick }) => {
  return React.createElement('button', {
    onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      fontSize: '11px',
      color: stripColor,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap' as const,
    },
    title: 'Translation — Click to change language',
  },
    React.createElement(Languages, { size: 12 }),
    React.createElement('span', { style: { fontWeight: 600 } }, 'EN'),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const translationFeature = {
  id: 'translation',
  name: 'Translation',
  description: 'Translate pages and text between English and Ghanaian languages — Twi, Ga, Ewe, Dagbani, Hausa, Fante.',
  stripColor: '#5DCAA5',
  icon: Languages,
  category: 'communication' as const,
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: TranslationIndicator,
      position: 'right' as const,
      order: 2,
    },
    toolbar: {
      icon: Globe,
      label: 'Translate Page',
      order: 3,
      onClick: () => console.log('[Translation] Translate current page'),
      dropdownItems: [
        {
          id: 'translation:twi',
          label: 'Translate to Twi',
          onClick: () => console.log('[Translation] Translate to Twi'),
        },
        {
          id: 'translation:ga',
          label: 'Translate to Ga',
          onClick: () => console.log('[Translation] Translate to Ga'),
        },
        {
          id: 'translation:ewe',
          label: 'Translate to Ewe',
          onClick: () => console.log('[Translation] Translate to Ewe'),
        },
        {
          id: 'translation:dagbani',
          label: 'Translate to Dagbani',
          onClick: () => console.log('[Translation] Translate to Dagbani'),
        },
        {
          id: 'translation:hausa',
          label: 'Translate to Hausa',
          onClick: () => console.log('[Translation] Translate to Hausa'),
        },
        {
          id: 'translation:fante',
          label: 'Translate to Fante',
          onClick: () => console.log('[Translation] Translate to Fante'),
        },
      ],
    },
    commandBar: [
      {
        id: 'translation:translate-page',
        label: 'Translate page',
        description: 'Translate the current page to a Ghanaian language',
        keywords: ['translate', 'page', 'language', 'convert', 'text'],
        action: () => console.log('[Translation] Translate page'),
        group: 'Translation',
      },
      {
        id: 'translation:to-twi',
        label: 'Translate to Twi',
        description: 'Translate page content to Twi',
        keywords: ['twi', 'akan', 'translate', 'ashanti', 'language'],
        action: () => console.log('[Translation] To Twi'),
        group: 'Translation',
      },
      {
        id: 'translation:to-ga',
        label: 'Translate to Ga',
        description: 'Translate page content to Ga',
        keywords: ['ga', 'accra', 'translate', 'language'],
        action: () => console.log('[Translation] To Ga'),
        group: 'Translation',
      },
      {
        id: 'translation:to-ewe',
        label: 'Translate to Ewe',
        description: 'Translate page content to Ewe',
        keywords: ['ewe', 'volta', 'translate', 'language'],
        action: () => console.log('[Translation] To Ewe'),
        group: 'Translation',
      },
      {
        id: 'translation:open-panel',
        label: 'Open translation panel',
        description: 'Open the full translation interface',
        keywords: ['translation', 'panel', 'open', 'dictionary', 'lookup'],
        action: () => console.log('[Translation] Open panel'),
        group: 'Translation',
      },
    ],
  },
};

FeatureRegistry.register(translationFeature);

export default translationFeature;
