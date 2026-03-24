import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaces';

// ── Constants ─────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#3B82F6', // blue
  '#22C55E', // green
  '#EAB308', // gold
  '#EF4444', // red
  '#8B5CF6', // purple
  '#14B8A6', // teal
  '#F97316', // orange
  '#EC4899', // pink
];

const TRANSITION = 'background 150ms ease, color 150ms ease, border-color 150ms ease, opacity 150ms ease';

// ── Component ─────────────────────────────────────────────────────────
export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, switchWorkspace, createWorkspace } = useWorkspaceStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [hoveredPill, setHoveredPill] = useState<string | null>(null);
  const [hoveredPlus, setHoveredPlus] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const creationRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when entering creation mode
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // Close creation panel on outside click
  useEffect(() => {
    if (!isCreating) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (creationRef.current && !creationRef.current.contains(e.target as Node)) {
        cancelCreation();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreating]);

  const cancelCreation = useCallback(() => {
    setIsCreating(false);
    setNewName('');
    setSelectedColor(PRESET_COLORS[0]);
  }, []);

  const handleCreate = useCallback(() => {
    const name = newName.trim();
    if (name) {
      createWorkspace(name, selectedColor);
    }
    cancelCreation();
  }, [newName, selectedColor, createWorkspace, cancelCreation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelCreation();
    }
  }, [handleCreate, cancelCreation]);

  const startCreation = useCallback(() => {
    // Pick next color based on workspace count
    const nextColor = PRESET_COLORS[workspaces.length % PRESET_COLORS.length];
    setSelectedColor(nextColor);
    setIsCreating(true);
  }, [workspaces.length]);

  // ── Empty state ───────────────────────────────────────────────────
  if (workspaces.length === 0 && !isCreating) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 32,
          padding: '0 12px',
          background: 'var(--color-surface-1, #1a1a2e)',
          borderBottom: '1px solid var(--color-border-1, rgba(255,255,255,0.06))',
          flexShrink: 0,
          // @ts-ignore
          WebkitAppRegion: 'no-drag',
        }}
      >
        <button
          onClick={startCreation}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 14px',
            borderRadius: 6,
            border: '1px dashed var(--color-border-1, rgba(255,255,255,0.15))',
            background: 'transparent',
            color: 'var(--color-text-secondary, #8892b0)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            transition: TRANSITION,
          }}
        >
          <Plus size={14} />
          Create your first workspace
        </button>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 32,
        padding: '0 8px',
        gap: 6,
        background: 'var(--color-surface-1, #1a1a2e)',
        borderBottom: '1px solid var(--color-border-1, rgba(255,255,255,0.06))',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
        position: 'relative',
        // @ts-ignore
        WebkitAppRegion: 'no-drag',
      }}
    >
      {/* ── Workspace pills ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 auto', minWidth: 0 }}>
        {workspaces.map((ws, idx) => {
          const isActive = ws.id === activeWorkspaceId;
          const isHovered = hoveredPill === ws.id;
          const showKeyHint = idx === 0 && isHovered;

          return (
            <div key={ws.id} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => switchWorkspace(ws.id)}
                onMouseEnter={() => setHoveredPill(ws.id)}
                onMouseLeave={() => setHoveredPill(null)}
                title={`${ws.name} — ${ws.tabIds.length} tab${ws.tabIds.length !== 1 ? 's' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  borderLeft: isActive ? `2px solid ${ws.color}` : '2px solid transparent',
                  background: isActive
                    ? `${ws.color}26`
                    : isHovered
                      ? 'var(--color-surface-2, rgba(255,255,255,0.06))'
                      : 'transparent',
                  color: isActive
                    ? ws.color
                    : isHovered
                      ? 'var(--color-text-primary, #ccd6f6)'
                      : 'var(--color-text-secondary, #8892b0)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: TRANSITION,
                  lineHeight: '20px',
                  height: 24,
                  outline: 'none',
                }}
              >
                {/* Color dot */}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ws.color,
                    flexShrink: 0,
                    boxShadow: isActive ? `0 0 6px ${ws.color}60` : 'none',
                    transition: 'box-shadow 150ms ease',
                  }}
                />

                {/* Workspace name */}
                <span style={{ letterSpacing: '0.01em' }}>{ws.name}</span>

                {/* Tab count badge */}
                {ws.tabIds.length > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      background: isActive ? `${ws.color}30` : 'rgba(255,255,255,0.08)',
                      color: isActive ? ws.color : 'var(--color-text-muted, #5a6380)',
                      padding: '0 5px',
                      borderRadius: 8,
                      lineHeight: '16px',
                      minWidth: 18,
                      textAlign: 'center' as const,
                      transition: TRANSITION,
                    }}
                  >
                    {ws.tabIds.length}
                  </span>
                )}
              </button>

              {/* Keyboard shortcut tooltip (first pill only) */}
              {showKeyHint && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: 4,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--color-surface-2, #2a2a3e)',
                    border: '1px solid var(--color-border-1, rgba(255,255,255,0.1))',
                    color: 'var(--color-text-muted, #5a6380)',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 100,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  Ctrl+Alt+1
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Create workspace area ────────────────────────────────── */}
      {isCreating ? (
        <div
          ref={creationRef}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {/* Input row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Workspace name"
              style={{
                width: 130,
                height: 24,
                fontSize: 12,
                padding: '0 8px',
                border: `1px solid ${selectedColor}66`,
                borderRadius: 6,
                background: 'var(--color-surface-2, rgba(255,255,255,0.06))',
                color: 'var(--color-text-primary, #ccd6f6)',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = selectedColor;
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = `${selectedColor}66`;
              }}
            />
            <button
              onClick={cancelCreation}
              title="Cancel"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-text-muted, #5a6380)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: TRANSITION,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
                (e.currentTarget as HTMLButtonElement).style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted, #5a6380)';
              }}
            >
              <X size={12} />
            </button>
          </div>

          {/* Color picker popover */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 6px',
              borderRadius: 8,
              background: 'var(--color-surface-2, #2a2a3e)',
              border: '1px solid var(--color-border-1, rgba(255,255,255,0.1))',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 100,
            }}
          >
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                title={color}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: selectedColor === color
                    ? '2px solid white'
                    : '2px solid transparent',
                  background: color,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'transform 100ms ease, border-color 100ms ease',
                  transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: selectedColor === color ? `0 0 6px ${color}80` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={startCreation}
          onMouseEnter={() => setHoveredPlus(true)}
          onMouseLeave={() => setHoveredPlus(false)}
          title="Create workspace"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `1px solid ${hoveredPlus ? 'var(--color-text-secondary, #8892b0)' : 'var(--color-border-1, rgba(255,255,255,0.12))'}`,
            background: hoveredPlus ? 'var(--color-surface-2, rgba(255,255,255,0.08))' : 'transparent',
            color: hoveredPlus ? 'var(--color-text-primary, #ccd6f6)' : 'var(--color-text-muted, #5a6380)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            marginLeft: 'auto',
            transition: TRANSITION,
          }}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}
