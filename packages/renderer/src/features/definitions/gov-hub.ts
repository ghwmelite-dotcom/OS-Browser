import React from 'react';
import { Landmark, ExternalLink, Building, CreditCard, Shield, Heart, Zap, Droplets, FileCheck, MapPin, ChevronRight } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';
import { useTabsStore } from '@/store/tabs';

// ── Government service quick links ──────────────────────────────────
const GOV_SERVICES = [
  { label: 'Ghana.gov', url: 'https://ghana.gov.gh', icon: Building, desc: 'Official portal' },
  { label: 'GIFMIS', url: 'https://gifmis.finance.gov.gh', icon: CreditCard, desc: 'Financial management' },
  { label: 'GRA Tax Portal', url: 'https://gra.gov.gh', icon: FileCheck, desc: 'Tax filing & payments' },
  { label: 'SSNIT', url: 'https://ssnit.org.gh', icon: Shield, desc: 'Pensions & benefits' },
  { label: 'NIA / GhanaCard', url: 'https://nia.gov.gh', icon: CreditCard, desc: 'National ID services' },
  { label: 'NHIS', url: 'https://nhis.gov.gh', icon: Heart, desc: 'Health insurance' },
  { label: 'ECG', url: 'https://ecg.com.gh', icon: Zap, desc: 'Electricity bills' },
  { label: 'GWCL', url: 'https://gwcl.com.gh', icon: Droplets, desc: 'Water services' },
  { label: 'PPA', url: 'https://ppa.gov.gh', icon: FileCheck, desc: 'Procurement & tenders' },
  { label: 'Lands Commission', url: 'https://mlnr.gov.gh', icon: MapPin, desc: 'Land registry' },
];

const openTab = (url: string) => useTabsStore.getState().createTab(url);
const openGovHub = () => useTabsStore.getState().createTab('os-browser://gov');

// ── Sidebar Panel ───────────────────────────────────────────────────
const GovHubPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
        React.createElement(Landmark, { size: 16, style: { color: stripColor } }),
        React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Government Services'),
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
    }, 'Quick access to Ghana government portals and services.'),

    // Service list (scrollable)
    React.createElement('div', {
      style: { flex: 1, overflowY: 'auto' as const, padding: '0 8px' },
    },
      ...GOV_SERVICES.map(svc =>
        React.createElement('button', {
          key: svc.label,
          onClick: () => openTab(svc.url),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '10px 8px',
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
              width: 32, height: 32,
              borderRadius: '8px',
              background: `${stripColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            },
          }, React.createElement(svc.icon, { size: 16, style: { color: stripColor } })),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 500, fontSize: '13px' } }, svc.label),
            React.createElement('div', { style: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' } }, svc.desc),
          ),
          React.createElement(ChevronRight, { size: 14, style: { color: 'var(--color-text-muted)', flexShrink: 0 } }),
        ),
      ),
    ),

    // Open Full Hub button
    React.createElement('div', { style: { padding: '12px 16px', borderTop: '1px solid var(--color-border-1)' } },
      React.createElement('button', {
        onClick: openGovHub,
        style: {
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${stripColor}`,
          background: `${stripColor}12`,
          color: stripColor,
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        },
      },
        React.createElement(ExternalLink, { size: 14 }),
        'Open Full Government Hub',
      ),
    ),
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
        action: () => openGovHub(),
        group: 'Government',
      },
      {
        id: 'gov-hub:gifmis',
        label: 'Open GIFMIS',
        description: 'Ghana Integrated Financial Management Information System',
        keywords: ['gifmis', 'financial', 'management', 'budget', 'accounting', 'treasury'],
        action: () => openTab('https://gifmis.finance.gov.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:gra',
        label: 'Open GRA Portal',
        description: 'Ghana Revenue Authority — tax filing and payments',
        keywords: ['gra', 'tax', 'revenue', 'filing', 'vat', 'income', 'customs'],
        action: () => openTab('https://gra.gov.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ssnit',
        label: 'Open SSNIT Portal',
        description: 'Social Security and National Insurance Trust',
        keywords: ['ssnit', 'pension', 'social', 'security', 'insurance', 'retirement'],
        action: () => openTab('https://ssnit.org.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:nia',
        label: 'Open NIA Portal',
        description: 'National Identification Authority — GhanaCard services',
        keywords: ['nia', 'ghanacard', 'identification', 'national', 'id', 'card'],
        action: () => openTab('https://nia.gov.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ghana-gov',
        label: 'Open Ghana.gov',
        description: 'Official Ghana Government portal',
        keywords: ['ghana', 'gov', 'official', 'government', 'portal', 'services'],
        action: () => openTab('https://ghana.gov.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ecg',
        label: 'Open ECG Portal',
        description: 'Electricity Company of Ghana — bills and outages',
        keywords: ['ecg', 'electricity', 'power', 'bills', 'outage', 'prepaid', 'meter'],
        action: () => openTab('https://ecg.com.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:gwcl',
        label: 'Open GWCL Portal',
        description: 'Ghana Water Company Limited — water services',
        keywords: ['gwcl', 'water', 'bills', 'service', 'utility'],
        action: () => openTab('https://gwcl.com.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:ppa',
        label: 'Open PPA Portal',
        description: 'Public Procurement Authority — tenders and procurement',
        keywords: ['ppa', 'procurement', 'tender', 'public', 'contracts', 'bidding'],
        action: () => openTab('https://ppa.gov.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:lands',
        label: 'Open Lands Commission',
        description: 'Lands Commission — land registry and title search',
        keywords: ['lands', 'commission', 'land', 'registry', 'title', 'property', 'deed'],
        action: () => openTab('https://mlnr.gov.gh'),
        group: 'Government',
      },
      {
        id: 'gov-hub:nhis',
        label: 'Open NHIS Portal',
        description: 'National Health Insurance Scheme',
        keywords: ['nhis', 'health', 'insurance', 'national', 'medical', 'hospital', 'clinic'],
        action: () => openTab('https://nhis.gov.gh'),
        group: 'Government',
      },
    ],
  },
};

FeatureRegistry.register(govHubFeature);

export default govHubFeature;
