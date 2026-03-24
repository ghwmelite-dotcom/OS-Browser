import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Plus, X, Hash } from 'lucide-react';
import type { SidebarPanelProps } from '@/features/registry';
import { ghanaUSSDCodes, USSD_CATEGORIES, CATEGORY_COLORS } from '@/data/ghana-ussd-codes';
import type { USSDCode, USSDCategory } from '@/data/ghana-ussd-codes';
import USSDEntry from './USSDEntry';

// ── localStorage key scoped to profile ─────────────────────────────
const CUSTOM_CODES_KEY = 'ozzysurf:ussd:custom-codes';

function loadCustomCodes(): USSDCode[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CODES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as USSDCode[];
  } catch {
    return [];
  }
}

function saveCustomCodes(codes: USSDCode[]): void {
  try {
    localStorage.setItem(CUSTOM_CODES_KEY, JSON.stringify(codes));
  } catch { /* quota exceeded or unavailable */ }
}

// ── Filter type including "All" and "Custom" ───────────────────────
type FilterTab = 'All' | USSDCategory | 'Custom';
const ALL_TABS: FilterTab[] = ['All', ...USSD_CATEGORIES, 'Custom'];

// ── Simple search matching ─────────────────────────────────────────
function matchesSearch(entry: USSDCode, query: string): boolean {
  const q = query.toLowerCase();
  return (
    entry.code.toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q) ||
    entry.carrier.toLowerCase().includes(q) ||
    entry.keywords.some(kw => kw.toLowerCase().includes(q))
  );
}

/**
 * USSDPanel -- Sidebar panel for the USSD Code Book feature.
 *
 * Search bar, category filter tabs, scrollable list of USSD codes,
 * and an "Add Custom Code" form at the bottom.
 */
const USSDPanel: React.FC<SidebarPanelProps> = ({ width, stripColor }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [customCodes, setCustomCodes] = useState<USSDCode[]>(loadCustomCodes);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // New custom code form state
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<USSDCategory>('Custom');

  // Show toast notification
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Persist custom codes when they change
  useEffect(() => {
    saveCustomCodes(customCodes);
  }, [customCodes]);

  // Combined code list
  const allCodes = useMemo(() => {
    const custom = customCodes.map(c => ({ ...c, category: 'Custom' as USSDCategory }));
    return [...ghanaUSSDCodes, ...custom];
  }, [customCodes]);

  // Filtered results
  const filteredCodes = useMemo(() => {
    let results = allCodes;

    // Category filter
    if (activeTab === 'Custom') {
      results = customCodes.map(c => ({ ...c, category: 'Custom' as USSDCategory }));
    } else if (activeTab !== 'All') {
      results = results.filter(c => c.category === activeTab);
    }

    // Search filter
    if (search.trim()) {
      results = results.filter(c => matchesSearch(c, search.trim()));
    }

    return results;
  }, [allCodes, customCodes, activeTab, search]);

  // Add custom code handler
  const handleAddCustom = useCallback(() => {
    if (!newCode.trim() || !newDescription.trim()) return;

    const code = newCode.trim().startsWith('*') ? newCode.trim() : `*${newCode.trim()}`;
    const finalCode = code.endsWith('#') ? code : `${code}#`;

    const entry: USSDCode = {
      code: finalCode,
      description: newDescription.trim(),
      category: newCategory,
      carrier: 'Custom',
      keywords: [newDescription.toLowerCase()],
    };

    setCustomCodes(prev => [...prev, entry]);
    setNewCode('');
    setNewDescription('');
    setNewCategory('Custom');
    setShowAddForm(false);
    showToast(`Added ${finalCode}`);
  }, [newCode, newDescription, newCategory, showToast]);

  // Delete custom code
  const handleDeleteCustom = useCallback((code: string) => {
    setCustomCodes(prev => prev.filter(c => c.code !== code));
    showToast('Custom code removed');
  }, [showToast]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <div style={{ padding: '12px 12px 8px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 10px',
            height: 36,
            borderRadius: 8,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
            transition: 'border-color 150ms ease',
          }}
        >
          <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search USSD codes, carriers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: 4,
                border: 'none',
                background: 'var(--color-surface-3)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* ── Category Filter Tabs ───────────────────────────────────── */}
      <div
        className="kente-panel-scroll"
        style={{
          display: 'flex',
          gap: 4,
          padding: '0 12px 8px',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {ALL_TABS.map(tab => {
          const isActive = activeTab === tab;
          const tabColor = tab === 'All' ? stripColor
            : tab === 'Custom' ? '#6B7280'
            : CATEGORY_COLORS[tab as USSDCategory] || stripColor;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                background: isActive ? `${tabColor}20` : 'transparent',
                color: isActive ? tabColor : 'var(--color-text-secondary)',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Results Count ──────────────────────────────────────────── */}
      <div
        style={{
          padding: '0 12px 6px',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          flexShrink: 0,
        }}
      >
        {filteredCodes.length} code{filteredCodes.length !== 1 ? 's' : ''} found
      </div>

      {/* ── Scrollable Code List ───────────────────────────────────── */}
      <div
        className="kente-panel-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 12 }}>
          {filteredCodes.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '40px 16px',
                color: 'var(--color-text-muted)',
              }}
            >
              <Hash size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13 }}>No codes match your search</span>
              <span style={{ fontSize: 11 }}>Try a different keyword or category</span>
            </div>
          ) : (
            filteredCodes.map((entry, i) => (
              <div key={`${entry.code}-${entry.carrier}-${i}`} style={{ position: 'relative' }}>
                <USSDEntry entry={entry} stripColor={stripColor} />
                {/* Delete button for custom codes */}
                {entry.carrier === 'Custom' && (
                  <button
                    onClick={() => handleDeleteCustom(entry.code)}
                    title="Remove custom code"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      cursor: 'pointer',
                      fontSize: 10,
                      padding: 0,
                    }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Add Custom Code Section ────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--color-border-1)',
          padding: 12,
        }}
      >
        {showAddForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="*123#"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                style={{
                  flex: '0 0 90px',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border-1)',
                  background: 'var(--color-surface-2)',
                  color: '#D4A017',
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  fontWeight: 700,
                  outline: 'none',
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              />
              <input
                type="text"
                placeholder="Description"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border-1)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-primary)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as USSDCategory)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border-1)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-primary)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {[...USSD_CATEGORIES, 'Custom' as USSDCategory].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={handleAddCustom}
                disabled={!newCode.trim() || !newDescription.trim()}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: stripColor,
                  color: '#0f1117',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: (!newCode.trim() || !newDescription.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (!newCode.trim() || !newDescription.trim()) ? 0.5 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                Save
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewCode(''); setNewDescription(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '8px 0',
              borderRadius: 8,
              border: `1px dashed var(--color-border-2)`,
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = stripColor;
              e.currentTarget.style.color = stripColor;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-2)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Plus size={14} />
            Add Custom Code
          </button>
        )}
      </div>

      {/* ── Toast Notification ─────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 16px',
            borderRadius: 8,
            background: 'var(--color-surface-3)',
            border: '1px solid var(--color-border-2)',
            color: 'var(--color-text-primary)',
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            zIndex: 100,
            animation: 'ussd-toast-in 200ms ease-out',
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes ussd-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default USSDPanel;
