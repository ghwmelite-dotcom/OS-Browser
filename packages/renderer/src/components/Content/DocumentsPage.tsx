import React, { useRef, useState, useCallback } from 'react';
import {
  FileText, Download, Search, Plus, Trash2, Eye, MessageSquare,
  SortAsc, Filter, Award, X, MoreVertical, Image, FileSpreadsheet,
  Presentation, File as FileIcon, ChevronDown,
} from 'lucide-react';
import { useDocumentsStore, downloadDocument, type Document } from '@/store/documents';

// ── Helpers ─────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'pdf': return { icon: FileText, color: '#DC2626' };
    case 'doc': return { icon: FileText, color: '#2563EB' };
    case 'xls': return { icon: FileSpreadsheet, color: '#16A34A' };
    case 'ppt': return { icon: Presentation, color: '#EA580C' };
    case 'img': return { icon: Image, color: '#9333EA' };
    default: return { icon: FileIcon, color: '#6B7280' };
  }
}

function getStampStyle(stamp: Document['stamp']) {
  switch (stamp) {
    case 'approved': return { bg: '#16A34A22', color: '#16A34A', label: 'APPROVED' };
    case 'rejected': return { bg: '#DC262622', color: '#DC2626', label: 'REJECTED' };
    case 'draft': return { bg: '#D9731522', color: '#D97315', label: 'DRAFT' };
    case 'reviewed': return { bg: '#2563EB22', color: '#2563EB', label: 'REVIEWED' };
    default: return null;
  }
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'official', label: 'Official' },
  { value: 'shared', label: 'Shared' },
] as const;

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' },
] as const;

const STAMP_OPTIONS: { value: Document['stamp']; label: string; color: string }[] = [
  { value: 'approved', label: 'Approved', color: '#16A34A' },
  { value: 'rejected', label: 'Rejected', color: '#DC2626' },
  { value: 'draft', label: 'Draft', color: '#D97315' },
  { value: 'reviewed', label: 'Reviewed', color: '#2563EB' },
  { value: null, label: 'Clear stamp', color: '#6B7280' },
];

// ── Context Menu ────────────────────────────────────────────────────
function DocumentContextMenu({
  doc,
  position,
  onClose,
}: {
  doc: Document;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const { removeDocument, setStamp, updateDocument, openDocument } = useDocumentsStore();
  const [showStamps, setShowStamps] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [annotation, setAnnotation] = useState(doc.annotation || '');

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 9999,
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-1)',
    borderRadius: '12px',
    padding: '6px',
    minWidth: '200px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--color-text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    textAlign: 'left',
  };

  if (showAnnotation) {
    return (
      <>
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          onClick={onClose}
        />
        <div style={{ ...menuStyle, padding: '12px', minWidth: '260px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
            Annotation for {doc.name}
          </p>
          <textarea
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--color-border-1)',
              background: 'var(--color-surface-1)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
            placeholder="Add a note..."
            autoFocus
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                ...itemStyle,
                width: 'auto',
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'var(--color-surface-1)',
                fontSize: '12px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                updateDocument(doc.id, { annotation });
                onClose();
              }}
              style={{
                ...itemStyle,
                width: 'auto',
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '12px',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      <div style={menuStyle}>
        <button
          style={itemStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          onClick={() => { openDocument(doc.id); onClose(); }}
        >
          <Eye size={14} /> Open
        </button>
        <button
          style={itemStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          onClick={() => { downloadDocument(doc); onClose(); }}
        >
          <Download size={14} /> Download
        </button>
        <div style={{ height: '1px', background: 'var(--color-border-1)', margin: '4px 0' }} />

        {/* Stamps */}
        <button
          style={itemStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          onClick={() => setShowStamps(!showStamps)}
        >
          <Award size={14} /> Stamp as...
          <ChevronDown size={12} style={{ marginLeft: 'auto' }} />
        </button>
        {showStamps && (
          <div style={{ paddingLeft: '12px' }}>
            {STAMP_OPTIONS.map((s) => (
              <button
                key={s.label}
                style={{ ...itemStyle, fontSize: '12px', padding: '6px 12px' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                onClick={() => { setStamp(doc.id, s.value); onClose(); }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
        )}

        <button
          style={itemStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          onClick={() => setShowAnnotation(true)}
        >
          <MessageSquare size={14} /> Add annotation
        </button>

        {/* Category */}
        <div style={{ height: '1px', background: 'var(--color-border-1)', margin: '4px 0' }} />
        <div style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Category
        </div>
        {(['personal', 'official', 'shared'] as const).map((cat) => (
          <button
            key={cat}
            style={{
              ...itemStyle,
              fontSize: '12px',
              padding: '5px 12px',
              fontWeight: doc.category === cat ? 600 : 400,
              color: doc.category === cat ? 'var(--color-accent)' : 'var(--color-text-primary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => { updateDocument(doc.id, { category: cat }); onClose(); }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}

        <div style={{ height: '1px', background: 'var(--color-border-1)', margin: '4px 0' }} />
        <button
          style={{ ...itemStyle, color: '#DC2626' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#DC262612'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          onClick={() => { removeDocument(doc.id); onClose(); }}
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </>
  );
}

// ── Document Card ───────────────────────────────────────────────────
function DocumentCard({ doc }: { doc: Document }) {
  const { openDocument } = useDocumentsStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const typeInfo = getTypeIcon(doc.type);
  const stampInfo = getStampStyle(doc.stamp);
  const IconComp = typeInfo.icon;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <div
        className="document-card"
        onContextMenu={handleContextMenu}
        onDoubleClick={() => openDocument(doc.id)}
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-1)',
          borderRadius: '14px',
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease-out',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
          e.currentTarget.style.borderColor = 'var(--color-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'var(--color-border-1)';
        }}
      >
        {/* Actions button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setContextMenu({ x: rect.right - 200, y: rect.bottom + 4 });
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: '4px',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <MoreVertical size={16} />
        </button>

        {/* Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `${typeInfo.color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <IconComp size={24} style={{ color: typeInfo.color }} />
        </div>

        {/* Name */}
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '4px',
          }}
          title={doc.name}
        >
          {doc.name}
        </p>

        {/* Meta */}
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          .{doc.name.split('.').pop()} &middot; {formatSize(doc.size)}
        </p>

        {/* Annotation preview */}
        {doc.annotation && (
          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              marginTop: '6px',
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={doc.annotation}
          >
            {doc.annotation}
          </p>
        )}

        {/* Stamp */}
        {stampInfo && (
          <div
            style={{
              marginTop: '10px',
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '6px',
              background: stampInfo.bg,
              color: stampInfo.color,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            {stampInfo.label}
          </div>
        )}
      </div>

      {contextMenu && (
        <DocumentContextMenu
          doc={doc}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

// ── Storage Bar ─────────────────────────────────────────────────────
function StorageBar() {
  const totalSize = useDocumentsStore((s) => s.documents.reduce((sum, d) => sum + d.size, 0));
  const maxSize = 100 * 1024 * 1024;
  const pct = Math.min((totalSize / maxSize) * 100, 100);
  const barColor = pct > 90 ? '#DC2626' : pct > 70 ? '#D97315' : 'var(--color-accent)';

  return (
    <div
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        Storage: {formatSize(totalSize)} / 100 MB
      </span>
      <div
        style={{
          flex: 1,
          height: '8px',
          borderRadius: '4px',
          background: 'var(--color-surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: '4px',
            background: barColor,
            transition: 'width 0.4s ease-out',
          }}
        />
      </div>
    </div>
  );
}

// ── Dropdown ────────────────────────────────────────────────────────
function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  icon?: React.FC<any>;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--color-border-1)',
          background: 'var(--color-surface-1)',
          color: 'var(--color-text-primary)',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {Icon && <Icon size={14} />}
        <span style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
        {current?.label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              zIndex: 51,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
              borderRadius: '10px',
              padding: '4px',
              minWidth: '140px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 12px',
                  background: opt.value === value ? 'var(--color-surface-1)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: opt.value === value ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  fontWeight: opt.value === value ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'var(--color-surface-1)'; }}
                onMouseLeave={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
export function DocumentsPage() {
  const {
    documents,
    searchQuery,
    selectedCategory,
    sortBy,
    addDocument,
    setSearchQuery,
    setCategory,
    setSortBy,
    getFilteredDocuments,
  } = useDocumentsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = getFilteredDocuments();

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        await addDocument(files[i]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import document');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [addDocument]);

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <FileText size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Document Workspace
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Manage, annotate, and organize your documents
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          {/* Search */}
          <div
            style={{
              flex: '1 1 200px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border-1)',
              background: 'var(--color-surface-1)',
            }}
          >
            <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  padding: '2px',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Dropdown
            label=""
            value={selectedCategory}
            options={CATEGORIES}
            onChange={setCategory}
            icon={Filter}
          />

          <Dropdown
            label="Sort"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
            icon={SortAsc}
          />

          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: importing ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              opacity: importing ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} />
            {importing ? 'Importing...' : 'Import'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: '#DC262612',
              border: '1px solid #DC262640',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#DC2626',
            }}
          >
            {error}
            <button
              onClick={() => setError(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Document Grid or Empty State */}
        {documents.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              borderRadius: '16px',
              border: '1px solid var(--color-border-1)',
              background: 'var(--color-surface-1)',
            }}
          >
            <FileText
              size={52}
              style={{ color: 'var(--color-text-muted)', opacity: 0.2, marginBottom: '16px' }}
            />
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              No documents yet
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 20px' }}>
              Import your first document to start organizing, annotating, and stamping your files.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={18} /> Import Document
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              borderRadius: '16px',
              border: '1px solid var(--color-border-1)',
              background: 'var(--color-surface-1)',
            }}
          >
            <Search size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.2, marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              No documents match your search or filter.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}

        {/* Storage bar */}
        {documents.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <StorageBar />
          </div>
        )}
      </div>
    </div>
  );
}
