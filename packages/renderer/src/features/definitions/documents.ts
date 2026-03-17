import React from 'react';
import { FileText, ExternalLink, Clock, Upload, FolderOpen, ChevronRight, File } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';
import { useTabsStore } from '@/store/tabs';
import { useDocumentsStore, type Document } from '@/store/documents';

const openDocuments = () => useTabsStore.getState().createTab('os-browser://documents');

function triggerFileImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = async () => {
    if (!input.files) return;
    for (let i = 0; i < input.files.length; i++) {
      try {
        await useDocumentsStore.getState().addDocument(input.files[i]);
      } catch {
        // ignore individual file errors in sidebar quick action
      }
    }
  };
  input.click();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'pdf': return '#DC2626';
    case 'doc': return '#2563EB';
    case 'xls': return '#16A34A';
    case 'ppt': return '#EA580C';
    case 'img': return '#9333EA';
    default: return '#6B7280';
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Sidebar Panel ───────────────────────────────────────────────────
const DocumentsPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  const documents = useDocumentsStore((s) => s.documents);
  const recentDocs = [...documents]
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, 5);
  const docCount = documents.length;

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
        docCount > 0 && React.createElement('span', {
          style: {
            fontSize: '11px',
            background: `${stripColor}20`,
            color: stripColor,
            padding: '1px 8px',
            borderRadius: '10px',
            fontWeight: 600,
          },
        }, docCount),
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

    // Quick actions
    React.createElement('div', {
      style: { padding: '8px 12px', display: 'flex', gap: '6px' },
    },
      React.createElement('button', {
        onClick: triggerFileImport,
        style: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px',
          borderRadius: '8px',
          border: `1px solid ${stripColor}`,
          background: `${stripColor}12`,
          color: stripColor,
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: 'inherit',
        },
      },
        React.createElement(Upload, { size: 13 }),
        'Import',
      ),
      React.createElement('button', {
        onClick: openDocuments,
        style: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid var(--color-border-1)',
          background: 'transparent',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: 'inherit',
        },
      },
        React.createElement(FolderOpen, { size: 13 }),
        'Browse All',
      ),
    ),

    // Recent documents list
    React.createElement('div', {
      style: { flex: 1, overflowY: 'auto' as const, padding: '4px 8px' },
    },
      recentDocs.length > 0
        ? [
            React.createElement('div', {
              key: 'recent-label',
              style: {
                padding: '8px 8px 4px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
              },
            }, 'Recent'),
            ...recentDocs.map((doc: Document) =>
              React.createElement('button', {
                key: doc.id,
                onClick: () => {
                  useDocumentsStore.getState().openDocument(doc.id);
                },
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 8px',
                  margin: '1px 0',
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
                    width: 30, height: 30,
                    borderRadius: '8px',
                    background: `${getTypeColor(doc.type)}16`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  },
                }, React.createElement(File, { size: 14, style: { color: getTypeColor(doc.type) } })),
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                  React.createElement('div', {
                    style: {
                      fontWeight: 500,
                      fontSize: '12px',
                      whiteSpace: 'nowrap' as const,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }, doc.name),
                  React.createElement('div', {
                    style: { fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '1px' },
                  }, `${formatSize(doc.size)} \u00B7 ${timeAgo(doc.lastOpenedAt)}`),
                ),
              ),
            ),
          ]
        : React.createElement('div', {
            style: {
              textAlign: 'center' as const,
              padding: '32px 16px',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
            },
          },
            React.createElement(FileText, { size: 28, style: { opacity: 0.2, marginBottom: '8px' } }),
            React.createElement('p', null, 'No documents yet'),
            React.createElement('p', { style: { fontSize: '11px', marginTop: '4px' } }, 'Import a file to get started'),
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
        action: () => triggerFileImport(),
        group: 'Documents',
      },
    ],
  },
};

FeatureRegistry.register(documentsFeature);

export default documentsFeature;
