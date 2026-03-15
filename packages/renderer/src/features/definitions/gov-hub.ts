import React from 'react';
import { Landmark } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

// ── Sidebar Panel ───────────────────────────────────────────────────
const GovHubPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
      React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Government Services'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' },
      }, '\u00D7'),
    ),
    React.createElement('div', { style: { padding: '12px 16px', fontSize: '13px', opacity: 0.7 } },
      'Access GIFMIS, GRA, SSNIT, NIA, and more government services.',
    ),
    React.createElement('button', {
      onClick: () => console.log('[GovHub] Navigate to os-browser://gov'),
      style: {
        margin: '8px 16px',
        padding: '10px',
        borderRadius: '8px',
        border: `1px solid ${stripColor}`,
        background: 'transparent',
        color: stripColor,
        cursor: 'pointer',
        fontSize: '13px',
      },
    }, 'Open full Government Hub'),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const govHubFeature = {
  id: 'gov-hub',
  name: 'Government Services',
  description: 'One-stop access to Ghana government portals — GIFMIS, GRA, SSNIT, NIA, and more.',
  stripColor: '#006B3F',
  icon: Landmark,
  category: 'government' as const,
  internalPageUrl: 'os-browser://gov',
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: GovHubPanel,
      order: 1,
      defaultPanelWidth: 340,
    },
    commandBar: [
      {
        id: 'gov-hub:open',
        label: 'Open Government Hub',
        description: 'Browse all government services',
        keywords: ['government', 'gov', 'services', 'hub', 'portal', 'ghana'],
        action: () => console.log('[GovHub] Open hub'),
        group: 'Government',
      },
      {
        id: 'gov-hub:gifmis',
        label: 'Open GIFMIS',
        description: 'Ghana Integrated Financial Management Information System',
        keywords: ['gifmis', 'financial', 'management', 'budget', 'accounting', 'treasury'],
        action: () => console.log('[GovHub] Open GIFMIS'),
        group: 'Government',
      },
      {
        id: 'gov-hub:gra',
        label: 'Open GRA Portal',
        description: 'Ghana Revenue Authority — tax filing and payments',
        keywords: ['gra', 'tax', 'revenue', 'filing', 'vat', 'income', 'customs'],
        action: () => console.log('[GovHub] Open GRA'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ssnit',
        label: 'Open SSNIT Portal',
        description: 'Social Security and National Insurance Trust',
        keywords: ['ssnit', 'pension', 'social', 'security', 'insurance', 'retirement'],
        action: () => console.log('[GovHub] Open SSNIT'),
        group: 'Government',
      },
      {
        id: 'gov-hub:nia',
        label: 'Open NIA Portal',
        description: 'National Identification Authority — GhanaCard services',
        keywords: ['nia', 'ghanacard', 'identification', 'national', 'id', 'card'],
        action: () => console.log('[GovHub] Open NIA'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ghana-gov',
        label: 'Open Ghana.gov',
        description: 'Official Ghana Government portal',
        keywords: ['ghana', 'gov', 'official', 'government', 'portal', 'services'],
        action: () => console.log('[GovHub] Open Ghana.gov'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ecg',
        label: 'Open ECG Portal',
        description: 'Electricity Company of Ghana — bills and outages',
        keywords: ['ecg', 'electricity', 'power', 'bills', 'outage', 'prepaid', 'meter'],
        action: () => console.log('[GovHub] Open ECG'),
        group: 'Government',
      },
      {
        id: 'gov-hub:gwcl',
        label: 'Open GWCL Portal',
        description: 'Ghana Water Company Limited — water services',
        keywords: ['gwcl', 'water', 'bills', 'service', 'utility'],
        action: () => console.log('[GovHub] Open GWCL'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ppa',
        label: 'Open PPA Portal',
        description: 'Public Procurement Authority — tenders and procurement',
        keywords: ['ppa', 'procurement', 'tender', 'public', 'contracts', 'bidding'],
        action: () => console.log('[GovHub] Open PPA'),
        group: 'Government',
      },
      {
        id: 'gov-hub:lands',
        label: 'Open Lands Commission',
        description: 'Lands Commission — land registry and title search',
        keywords: ['lands', 'commission', 'land', 'registry', 'title', 'property', 'deed'],
        action: () => console.log('[GovHub] Open Lands Commission'),
        group: 'Government',
      },
      {
        id: 'gov-hub:nhis',
        label: 'Open NHIS Portal',
        description: 'National Health Insurance Scheme',
        keywords: ['nhis', 'health', 'insurance', 'national', 'medical', 'hospital', 'clinic'],
        action: () => console.log('[GovHub] Open NHIS'),
        group: 'Government',
      },
    ],
  },
};

FeatureRegistry.register(govHubFeature);

export default govHubFeature;
