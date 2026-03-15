import React from 'react';
import { FileText, Download, FolderOpen, Search } from 'lucide-react';

export function DocumentsPage() {
  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[780px] mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Document Workspace</h1>
            <p className="text-[12px] text-text-muted">View, organize, and annotate your government documents</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Download, label: 'Recent Downloads', desc: 'PDFs and documents from browsing' },
            { icon: FolderOpen, label: 'Collections', desc: 'Organize by project or topic' },
            { icon: Search, label: 'Search Documents', desc: 'Find across all saved files' },
          ].map(action => (
            <button
              key={action.label}
              className="p-4 rounded-xl border text-left hover:bg-surface-2 transition-all"
              style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
            >
              <action.icon size={20} className="mb-2" style={{ color: 'var(--color-accent)' }} />
              <p className="text-[13px] font-semibold text-text-primary">{action.label}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>

        {/* Empty State */}
        <div
          className="text-center py-16 rounded-xl border"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
        >
          <FileText size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-[16px] font-medium text-text-primary mb-2">No documents yet</p>
          <p className="text-[13px] text-text-muted max-w-[400px] mx-auto">
            When you download PDFs and documents from government portals, they'll appear here for easy access and annotation.
          </p>
        </div>

        <div
          className="mt-8 rounded-xl p-5 border"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
        >
          <h3
            className="text-[13px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-accent)' }}
          >
            Coming Soon
          </h3>
          <ul className="space-y-2 text-[13px] text-text-secondary">
            <li>• PDF reading with annotations (highlight, stamp: Approved/Rejected/Draft)</li>
            <li>• Document collections for organizing work files</li>
            <li>• Full-text search across all documents</li>
            <li>• Official stamp annotations (Approved, Reviewed, Confidential)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
