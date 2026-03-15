import React from 'react';
import { FileText, ExternalLink, Clock, Upload, FolderOpen, ChevronRight } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';
import { useTabsStore } from '@/store/tabs';

const openDocuments = () => useTabsStore.getState().createTab('os-browser://documents');

const DOC_ACTIONS = [
  { label: 'Recent Documents', desc: 'View recently accessed documents', icon: Clock },
  { label: 'Import Document', desc: 'Import a file into workspace', icon: Upload },
  { label: 'Browse All', desc: 'Browse and manage all documents', icon: FolderOpen },
];

// ── Sidebar Panel ───────────────────────────────────────────────────
const DocumentsPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
        React.createElement(FileText, { size: 16, style: { color: stripColor } }),
        React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Documents'),
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
    }, 'Your document workspace — recent files, imports, and templates.'),

    // Actions
    React.createElement('div', {
      style: { flex: 1, overflowY: 'auto' as const, padding: '8px' },
    },
      ...DOC_ACTIONS.map(action =>
        React.createElement('button', {
          key: action.label,
          onClick: openDocuments,
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
              width: 32, height: 32,
              borderRadius: '8px',
              background: `${stripColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            },
          }, React.createElement(action.icon, { size: 16, style: { color: stripColor } })),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 500 } }, action.label),
            React.createElement('div', { style: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' } }, action.desc),
          ),
          React.createElement(ChevronRight, { size: 14, style: { color: 'var(--color-text-muted)', flexShrink: 0 } }),
        ),
      ),
    ),

    // Open Full Workspace button
    React.createElement('div', { style: { padding: '12px 16px', borderTop: '1px solid var(--color-border-1)' } },
      React.createElement('button', {
        onClick: openDocuments,
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
        'Open Document Workspace',
      ),
    ),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const documentsFeature = {
  id: 'documents',
  name: 'Documents',
  description: 'Manage documents, PDFs, and official files within the browser.',
  stripColor: '#D85A30',
  icon: FileText,
  category: 'productivity' as const,
  internalPageUrl: 'os-browser://documents',
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: DocumentsPanel,
      order: 3,
      defaultPanelWidth: 320,
    },
    commandBar: [
      {
        id: 'documents:open-workspace',
        label: 'Open document workspace',
        description: 'Browse and manage all documents',
        keywords: ['document', 'workspace', 'files', 'open', 'browse', 'manage'],
        action: () => openDocuments(),
        group: 'Documents',
      },
      {
        id: 'documents:recent',
        label: 'Recent documents',
        description: 'View recently accessed documents',
        keywords: ['recent', 'documents', 'latest', 'history', 'files', 'opened'],
        action: () => openDocuments(),
        group: 'Documents',
      },
      {
        id: 'documents:import',
        label: 'Import document',
        description: 'Import a file into the document workspace',
        keywords: ['import', 'upload', 'document', 'file', 'add', 'pdf', 'word'],
        action: () => openDocuments(),
        group: 'Documents',
      },
    ],
  },
};

FeatureRegistry.register(documentsFeature);

export default documentsFeature;
