import React from 'react';
import { Languages, Globe } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps } from '../registry';

const dispatchTranslation = () => {
  window.dispatchEvent(new CustomEvent('os-browser:translation-panel'));
};

const translateTo = (lang: string) => {
  window.dispatchEvent(new CustomEvent('os-browser:translate-to', { detail: { language: lang } }));
};

// Lazy-load the Translation panel for the sidebar
const LazyTranslationPanel = React.lazy(() =>
  import('@/components/Translation/TranslationPanel').then(m => ({ default: m.TranslationPanel }))
);

// ── Status Bar Indicator ────────────────────────────────────────────
const TranslationIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
  return React.createElement('span', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: 'var(--color-text-primary)',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap' as const,
    },
    title: 'Translation — Click to change language',
  },
    React.createElement(Languages, { size: 12, style: { color: stripColor } }),
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
    sidebar: {
      panelComponent: LazyTranslationPanel,
      order: 3,
      defaultPanelWidth: 400,
    },
    toolbar: {
      icon: Globe,
      label: 'Translate Page',
      order: 3,
      onClick: () => dispatchTranslation(),
      dropdownItems: [
        {
          id: 'translation:twi',
          label: 'Translate to Twi',
          onClick: () => translateTo('twi'),
        },
        {
          id: 'translation:ga',
          label: 'Translate to Ga',
          onClick: () => translateTo('ga'),
        },
        {
          id: 'translation:ewe',
          label: 'Translate to Ewe',
          onClick: () => translateTo('ewe'),
        },
        {
          id: 'translation:dagbani',
          label: 'Translate to Dagbani',
          onClick: () => translateTo('dagbani'),
        },
        {
          id: 'translation:hausa',
          label: 'Translate to Hausa',
          onClick: () => translateTo('hausa'),
        },
        {
          id: 'translation:fante',
          label: 'Translate to Fante',
          onClick: () => translateTo('fante'),
        },
      ],
    },
    commandBar: [
      {
        id: 'translation:translate-page',
        label: 'Translate page',
        description: 'Translate the current page to a Ghanaian language',
        keywords: ['translate', 'page', 'language', 'convert', 'text'],
        action: () => dispatchTranslation(),
        group: 'Translation',
      },
      {
        id: 'translation:to-twi',
        label: 'Translate to Twi',
        description: 'Translate page content to Twi',
        keywords: ['twi', 'akan', 'translate', 'ashanti', 'language'],
        action: () => translateTo('twi'),
        group: 'Translation',
      },
      {
        id: 'translation:to-ga',
        label: 'Translate to Ga',
        description: 'Translate page content to Ga',
        keywords: ['ga', 'accra', 'translate', 'language'],
        action: () => translateTo('ga'),
        group: 'Translation',
      },
      {
        id: 'translation:to-ewe',
        label: 'Translate to Ewe',
        description: 'Translate page content to Ewe',
        keywords: ['ewe', 'volta', 'translate', 'language'],
        action: () => translateTo('ewe'),
        group: 'Translation',
      },
      {
        id: 'translation:open-panel',
        label: 'Open translation panel',
        description: 'Open the full translation interface',
        keywords: ['translation', 'panel', 'open', 'dictionary', 'lookup'],
        action: () => dispatchTranslation(),
        group: 'Translation',
      },
    ],
  },
};

FeatureRegistry.register(translationFeature);

export default translationFeature;
