import React, { useState } from 'react';
import {
  Pencil, Trash2, Plus, Check, X, Pin, PinOff,
  Layers, ChevronDown, Settings, Clock, Sparkles,
} from 'lucide-react';
import type { SidebarPanelProps } from '@/features/registry';
import { useWorkspaceStore } from '@/store/workspaces';

// ── Constants ─────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#3B82F6', '#006B3F', '#D4A017', '#EF4444',
  '#8B5CF6', '#14B8A6', '#F97316', '#EC4899',
];

const AUTO_ARCHIVE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '1h', value: 1 },
  { label: '4h', value: 4 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
];

// ── Styles ────────────────────────────────────────────────────────────
const sectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: 10,
};

const card: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  border: '1px solid var(--color-border-1)',
};

const iconBtn = (color = 'var(--color-text-secondary)'): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  color,
  cursor: 'pointer',
  padding: 4,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.15s',
});

const badge = (bg: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  padding: '1px 6px',
  borderRadius: 9999,
  background: bg,
  color: '#fff',
  whiteSpace: 'nowrap',
});

// ── Component ─────────────────────────────────────────────────────────
export function WorkspaceManager({ width, stripColor, onClose }: SidebarPanelProps) {
  const {
    workspaces, activeWorkspaceId, createWorkspace,
    deleteWorkspace, renameWorkspace, recolorWorkspace, switchWorkspace,
  } = useWorkspaceStore();

  // Local UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [autoArchive, setAutoArchive] = useState(0);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  // ── Actions ───────────────────────────────────────────────────────
  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setColorPickerId(null);
    setConfirmDeleteId(null);
  };

  const confirmRename = () => {
    if (editingId && editName.trim()) {
      renameWorkspace(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string) => {
    deleteWorkspace(id);
    setConfirmDeleteId(null);
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = createWorkspace(name, newColor);
    switchWorkspace(id);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  };

  const handleSwitch = (id: string) => {
    switchWorkspace(id);
    setSwitchOpen(false);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        borderLeft: `3px solid ${stripColor}`,
        color: 'var(--color-text)',
      }}
    >
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--color-border-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} style={{ color: stripColor }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Workspaces</span>
        </div>
        <button onClick={onClose} style={iconBtn()}>
          <X size={16} />
        </button>
      </div>

      {/* ─── Scrollable content ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {/* ══════ Section 1: Current Workspace Info ══════ */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: activeWorkspace.color,
              border: '2px solid rgba(255,255,255,0.15)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 16, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeWorkspace.icon} {activeWorkspace.name}
            </span>
            <span style={badge('#10B981')}>Active</span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
            {activeWorkspace.tabIds.length} tab{activeWorkspace.tabIds.length !== 1 ? 's' : ''} open
          </div>

          {/* Switch dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSwitchOpen(!switchOpen)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border-1)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Switch workspace...</span>
              <ChevronDown size={14} style={{
                transition: 'transform 0.2s',
                transform: switchOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }} />
            </button>

            {switchOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-1)',
                borderRadius: 6,
                zIndex: 20,
                maxHeight: 180,
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}>
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: ws.id === activeWorkspaceId ? 'rgba(255,255,255,0.04)' : 'transparent',
                      border: 'none',
                      color: 'var(--color-text)',
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: ws.color, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ws.icon} {ws.name}
                    </span>
                    {ws.id === activeWorkspaceId && (
                      <Check size={12} style={{ color: '#10B981' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════ Section 2: Workspace List ══════ */}
        <div style={sectionHeader}>
          <Layers size={14} />
          <span>All Workspaces</span>
          <span style={{
            fontSize: 10, color: 'var(--color-text-secondary)',
            marginLeft: 'auto',
          }}>
            {workspaces.length}
          </span>
        </div>

        {workspaces.map(ws => {
          const isActive = ws.id === activeWorkspaceId;
          const isEditing = editingId === ws.id;
          const showColorPicker = colorPickerId === ws.id;
          const showDeleteConfirm = confirmDeleteId === ws.id;

          return (
            <div
              key={ws.id}
              style={{
                ...card,
                position: 'relative',
                cursor: isEditing ? 'default' : 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                borderColor: isActive ? ws.color : 'var(--color-border-1)',
              }}
              onClick={() => !isEditing && !showDeleteConfirm && switchWorkspace(ws.id)}
            >
              {/* Top row: dot + name + badge + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Color dot */}
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: ws.color, flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.12)',
                }} />

                {/* Name or rename input */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div
                      style={{ display: 'flex', gap: 4, alignItems: 'center' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: `1px solid ${ws.color}`,
                          background: 'rgba(255,255,255,0.06)',
                          color: 'inherit',
                          outline: 'none',
                        }}
                      />
                      <button onClick={confirmRename} style={iconBtn('#10B981')}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} style={iconBtn('#EF4444')}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'block',
                    }}>
                      {ws.icon} {ws.name}
                    </span>
                  )}
                </div>

                {/* Tab count badge */}
                <span style={{
                  ...badge('rgba(255,255,255,0.1)'),
                  color: 'var(--color-text-secondary)',
                }}>
                  {ws.tabIds.length} tab{ws.tabIds.length !== 1 ? 's' : ''}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 6px rgba(16,185,129,0.5)',
                    flexShrink: 0,
                  }} />
                )}
              </div>

              {/* Hover actions row */}
              {!isEditing && !showDeleteConfirm && (
                <div
                  className="ws-card-actions"
                  style={{
                    display: 'flex',
                    gap: 2,
                    marginTop: 8,
                    paddingTop: 6,
                    borderTop: '1px solid var(--color-border-1)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => startRename(ws.id, ws.name)}
                    title="Rename"
                    style={iconBtn()}
                  >
                    <Pencil size={13} />
                    <span style={{ fontSize: 11, marginLeft: 4 }}>Rename</span>
                  </button>

                  <button
                    onClick={() => {
                      setColorPickerId(showColorPicker ? null : ws.id);
                      setConfirmDeleteId(null);
                    }}
                    title="Change color"
                    style={iconBtn()}
                  >
                    <Sparkles size={13} />
                    <span style={{ fontSize: 11, marginLeft: 4 }}>Color</span>
                  </button>

                  {workspaces.length > 1 && (
                    <button
                      onClick={() => {
                        setConfirmDeleteId(ws.id);
                        setColorPickerId(null);
                      }}
                      title="Delete workspace"
                      style={{ ...iconBtn('#EF4444'), marginLeft: 'auto', opacity: 0.7 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Inline color picker */}
              {showColorPicker && (
                <div
                  style={{
                    display: 'flex', gap: 6, marginTop: 8,
                    flexWrap: 'wrap', padding: '8px 0 0',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { recolorWorkspace(ws.id, c); setColorPickerId(null); }}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', background: c,
                        border: c === ws.color ? '2px solid #fff' : '2px solid transparent',
                        cursor: 'pointer', padding: 0,
                        transition: 'transform 0.15s',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Delete confirmation */}
              {showDeleteConfirm && (
                <div
                  style={{
                    marginTop: 8, padding: '8px 10px',
                    background: 'rgba(239,68,68,0.08)',
                    borderRadius: 6,
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, marginBottom: 8 }}>
                    Are you sure? This will remove the workspace and unassign its tabs.
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleDelete(ws.id)}
                      style={{
                        flex: 1, padding: '5px 0', borderRadius: 5,
                        border: 'none', background: '#EF4444', color: '#fff',
                        fontWeight: 600, fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{
                        flex: 1, padding: '5px 0', borderRadius: 5,
                        border: '1px solid var(--color-border-1)',
                        background: 'transparent', color: 'var(--color-text-secondary)',
                        fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ══════ Section 3: Global Pins ══════ */}
        <div style={{ marginTop: 4 }}>
          <div style={sectionHeader}>
            <Pin size={14} />
            <span>Global Pins</span>
          </div>
          <div style={card}>
            <div style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              marginBottom: 8, lineHeight: 1.4,
            }}>
              These tabs appear in every workspace
            </div>
            {/* Empty state — global pins are not yet in the store */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 0', color: 'var(--color-text-secondary)',
              fontSize: 12, opacity: 0.6,
            }}>
              <PinOff size={14} style={{ marginRight: 6 }} />
              No global pins yet
            </div>
          </div>
        </div>

        {/* ══════ Section 4: Settings ══════ */}
        <div style={{ marginTop: 4 }}>
          <div style={sectionHeader}>
            <Settings size={14} />
            <span>Settings</span>
          </div>
          <div style={card}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} style={{ color: 'var(--color-text-secondary)' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Auto-archive</span>
              </div>
            </div>
            <div style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              marginBottom: 10, lineHeight: 1.4,
            }}>
              Automatically close inactive tabs after the set time
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {AUTO_ARCHIVE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAutoArchive(opt.value)}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    borderRadius: 5,
                    border: autoArchive === opt.value
                      ? `1px solid ${stripColor}`
                      : '1px solid var(--color-border-1)',
                    background: autoArchive === opt.value
                      ? `${stripColor}22`
                      : 'transparent',
                    color: autoArchive === opt.value
                      ? stripColor
                      : 'var(--color-text-secondary)',
                    fontWeight: autoArchive === opt.value ? 600 : 400,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom: Create New Workspace ────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--color-border-1)',
        background: 'var(--color-surface)',
      }}>
        <div style={{ ...sectionHeader, marginBottom: 8, fontSize: 12 }}>
          <Plus size={14} />
          <span>Create New Workspace</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Workspace name..."
            style={{
              flex: 1,
              fontSize: 12,
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-1)',
              background: 'var(--color-surface-2)',
              color: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            style={{
              padding: '7px 16px',
              borderRadius: 6,
              border: 'none',
              background: newName.trim() ? stripColor : 'rgba(255,255,255,0.06)',
              color: newName.trim() ? '#fff' : 'var(--color-text-secondary)',
              fontWeight: 600,
              fontSize: 12,
              cursor: newName.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            Create
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: c,
                border: c === newColor ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer', padding: 0,
                transition: 'transform 0.15s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
