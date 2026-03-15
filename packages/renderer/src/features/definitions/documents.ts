import React from 'react';
import { FileText } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

// ── Sidebar Panel ───────────────────────────────────────────────────
const DocumentsPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
      React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Documents'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' },
      }, '\u00D7'),
    ),
    React.createElement('div', { style: { padding: '12px 16px', fontSize: '13px', opacity: 0.7 } },
      'Your document workspace — recent files, imports, and templates.',
    ),
    React.createElement('button', {
      onClick: () => console.log('[Documents] Navigate to os-browser://documents'),
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
    }, 'Open Document Workspace'),
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
        action: () => console.log('[Documents] Open workspace'),
        group: 'Documents',
      },
      {
        id: 'documents:recent',
        label: 'Recent documents',
        description: 'View recently accessed documents',
        keywords: ['recent', 'documents', 'latest', 'history', 'files', 'opened'],
        action: () => console.log('[Documents] Recent documents'),
        group: 'Documents',
      },
      {
        id: 'documents:import',
        label: 'Import document',
        description: 'Import a file into the document workspace',
        keywords: ['import', 'upload', 'document', 'file', 'add', 'pdf', 'word'],
        action: () => console.log('[Documents] Import document'),
        group: 'Documents',
      },
    ],
  },
};

FeatureRegistry.register(documentsFeature);

export default documentsFeature;
