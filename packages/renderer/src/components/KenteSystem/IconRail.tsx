import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Settings, Plus, X } from 'lucide-react';
import type { FeatureDefinition, FeatureCategory } from '@/features/registry';
import { useWorkspaceStore } from '@/store/workspaces';
import { AudioWidget } from '@/components/MediaPlayer/AudioWidget';

interface IconRailProps {
  features: FeatureDefinition[];
  activePanel: string | null;
  onTogglePanel: (featureId: string) => void;
  onOpenSettings: () => void;
}

/** Category groups in display order */
const CATEGORY_GROUPS: { categories: FeatureCategory[] }[] = [
  { categories: ['communication', 'intelligence'] },
  { categories: ['government'] },
  { categories: ['productivity', 'infrastructure'] },
  { categories: ['finance'] },
];

const PRESET_COLORS = [
  '#3B82F6', '#22C55E', '#EAB308', '#EF4444',
  '#8B5CF6', '#14B8A6', '#F97316', '#EC4899',
];

/** Thin horizontal divider between sections */
function SectionDivider() {
  return (
    <div
      style={{
        width: 20,
        height: 1,
        background: 'var(--color-border-1)',
        margin: '4px auto',
        opacity: 0.5,
        borderRadius: 1,
      }}
    />
  );
}

// ── Workspace Icons (Opera-style, top of sidebar) ──

function WorkspaceIcons() {
  const { workspaces, activeWorkspaceId, switchWorkspace, createWorkspace } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredPlus, setHoveredPlus] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const creationRef = useRef<HTMLDivElement>(null);
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (isCreating) {
      if (inputRef.current) inputRef.current.focus();
      if (createBtnRef.current) {
        const rect = createBtnRef.current.getBoundingClientRect();
        setPopoverPos({ left: rect.right + 8, top: rect.top + rect.height / 2 });
      }
    }
  }, [isCreating]);

  useEffect(() => {
    if (!isCreating) return;
    const handler = (e: MouseEvent) => {
      if (creationRef.current && !creationRef.current.contains(e.target as Node)) {
        setIsCreating(false); setNewName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isCreating]);

  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  const handleCreate = () => {
    const name = newName.trim();
    if (name) createWorkspace(name, selectedColor);
    setIsCreating(false); setNewName(''); setSelectedColor(PRESET_COLORS[0]);
  };

  const handleMouseEnter = (id: string, el: HTMLElement) => {
    setHoveredId(id);
    tooltipTimer.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
      setShowTooltip(id);
    }, 300);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    setShowTooltip(null);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  };

  if (workspaces.length === 0 && !isCreating) {
    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <button
          onClick={() => {
            setSelectedColor(PRESET_COLORS[0]);
            setIsCreating(true);
          }}
          onMouseEnter={() => setHoveredPlus(true)}
          onMouseLeave={() => setHoveredPlus(false)}
          title="Create workspace"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: `1.5px dashed ${hoveredPlus ? 'var(--color-text-secondary)' : 'var(--color-border-1)'}`,
            background: hoveredPlus ? 'var(--color-surface-2)' : 'transparent',
            color: hoveredPlus ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
            padding: 0,
          }}
        >
          <Plus size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', flexShrink: 0 }}>
      {workspaces.map((ws) => {
        const isActive = ws.id === activeWorkspaceId;
        const isHovered = hoveredId === ws.id;

        return (
          <div key={ws.id} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            {/* Active accent bar */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 3,
                  borderRadius: '0 2px 2px 0',
                  background: ws.color,
                }}
              />
            )}
            <button
              onClick={() => switchWorkspace(ws.id)}
              onMouseEnter={(e) => handleMouseEnter(ws.id, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
              title={ws.name}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: 'none',
                background: isActive
                  ? `${ws.color}22`
                  : isHovered
                    ? 'var(--color-surface-2)'
                    : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'background 150ms ease, transform 100ms ease',
                transform: isActive ? 'scale(1)' : isHovered ? 'scale(1.05)' : 'scale(1)',
                padding: 0,
              }}
            >
              {/* Workspace initial letter in its color */}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isActive ? ws.color : isHovered ? ws.color : 'var(--color-text-secondary)',
                  letterSpacing: '-0.3px',
                  transition: 'color 150ms ease',
                  lineHeight: 1,
                }}
              >
                {ws.name.charAt(0).toUpperCase()}
              </span>

              {/* Small colored dot indicator at bottom-right */}
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: ws.color,
                  boxShadow: isActive ? `0 0 4px ${ws.color}80` : 'none',
                  border: '1.5px solid var(--color-surface-1)',
                  transition: 'box-shadow 150ms ease',
                }}
              />

              {/* Tab count badge */}
              {ws.tabIds.length > 0 && (isHovered || isActive) && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -2,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    background: ws.color,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                    border: '1.5px solid var(--color-surface-1)',
                  }}
                >
                  {ws.tabIds.length}
                </span>
              )}
            </button>

            {/* Tooltip */}
            {showTooltip === ws.id && (
              <div
                style={{
                  position: 'fixed',
                  left: tooltipPos.x,
                  top: tooltipPos.y,
                  transform: 'translateY(-50%)',
                  background: 'var(--color-surface-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 9999,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  border: '1px solid var(--color-border-1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ws.color, flexShrink: 0 }} />
                {ws.name}
                <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
                  {ws.tabIds.length} tab{ws.tabIds.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Create workspace button */}
      {isCreating ? (
        <div ref={creationRef} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <button
            ref={createBtnRef}
            style={{
              width: 32, height: 32, borderRadius: 10,
              border: `1.5px solid ${selectedColor}`,
              background: `${selectedColor}15`,
              color: selectedColor,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, fontSize: 14, fontWeight: 700,
            }}
          >
            {newName ? newName.charAt(0).toUpperCase() : '+'}
          </button>
          {/* Creation popover — fixed position to escape sidebar overflow */}
          <div
            style={{
              position: 'fixed',
              left: popoverPos.left,
              top: popoverPos.top,
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-1)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              zIndex: 9999,
              minWidth: 180,
            }}
          >
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
                if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
              }}
              placeholder="Workspace name"
              style={{
                height: 28,
                fontSize: 12,
                padding: '0 8px',
                border: `1px solid ${selectedColor}55`,
                borderRadius: 6,
                background: 'var(--color-surface-1)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: 16, height: 16, borderRadius: '50%', background: c,
                    border: selectedColor === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 100ms ease',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={handleCreate}
                style={{
                  flex: 1, height: 26, borderRadius: 6, border: 'none',
                  background: selectedColor, color: '#fff',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Create
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewName(''); }}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <button
            onClick={() => {
              setSelectedColor(PRESET_COLORS[workspaces.length % PRESET_COLORS.length]);
              setIsCreating(true);
            }}
            onMouseEnter={() => setHoveredPlus(true)}
            onMouseLeave={() => setHoveredPlus(false)}
            title="New workspace (Ctrl+Alt+N)"
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              border: `1px solid ${hoveredPlus ? 'var(--color-text-secondary)' : 'var(--color-border-1)'}`,
              background: hoveredPlus ? 'var(--color-surface-2)' : 'transparent',
              color: hoveredPlus ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease',
              padding: 0,
            }}
          >
            <Plus size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── IconRail Component ──

export function IconRail({
  features,
  activePanel,
  onTogglePanel,
  onOpenSettings,
}: IconRailProps) {
  const grouped = useMemo(() => {
    const sortByOrder = (a: FeatureDefinition, b: FeatureDefinition) =>
      (a.surfaces.sidebar?.order ?? 99) - (b.surfaces.sidebar?.order ?? 99);

    const groups: FeatureDefinition[][] = CATEGORY_GROUPS
      .map((g) =>
        features
          .filter((f) => g.categories.includes(f.category))
          .sort(sortByOrder),
      )
      .filter((g) => g.length > 0);

    const coveredCategories = CATEGORY_GROUPS.flatMap((g) => g.categories);
    const ungrouped = features
      .filter((f) => !coveredCategories.includes(f.category))
      .sort(sortByOrder);
    if (ungrouped.length) groups.push(ungrouped);

    return groups;
  }, [features]);

  return (
    <div
      className="kente-sidebar-thread"
      style={{
        width: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--kente-sidebar-bg, var(--color-surface-1))',
        borderRight: '1px solid var(--color-border-1)',
        paddingTop: 8,
        paddingBottom: 8,
        flexShrink: 0,
        height: '100%',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Workspace icons + feature icons — scrollable */}
      <div
        className="kente-icon-rail-list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Workspace icons at the top (Opera-style) */}
        <WorkspaceIcons />
        <SectionDivider />

        {/* Feature icons below */}
        {grouped.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <SectionDivider />}
            {group.map((f) => (
              <RailIcon
                key={f.id}
                feature={f}
                isActive={activePanel === f.id}
                onClick={() => onTogglePanel(f.id)}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Media player widget — appears when any tab plays audio */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <AudioWidget />
      </div>

      {/* Settings gear pinned to bottom */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          paddingTop: 4,
        }}
      >
        <RailIconButton
          icon={<Settings size={18} />}
          label="Settings"
          isActive={false}
          stripColor="var(--color-text-muted)"
          onClick={onOpenSettings}
        />
      </div>

      <style>{`
        .kente-icon-rail-list::-webkit-scrollbar {
          width: 3px;
        }
        .kente-icon-rail-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .kente-icon-rail-list::-webkit-scrollbar-thumb {
          background: var(--color-border-2);
          border-radius: 2px;
        }
        .kente-icon-rail-list::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}

/* Individual rail icon */

function RailIcon({
  feature,
  isActive,
  onClick,
}: {
  feature: FeatureDefinition;
  isActive: boolean;
  onClick: () => void;
}) {
  const sidebarDef = feature.surfaces.sidebar!;
  const IconComp = feature.icon;
  const badgeCount =
    typeof sidebarDef.getBadgeCount === 'function'
      ? sidebarDef.getBadgeCount()
      : 0;

  return (
    <RailIconButton
      icon={<IconComp size={18} />}
      label={feature.name}
      isActive={isActive}
      stripColor={feature.stripColor}
      badge={badgeCount > 0 ? badgeCount : undefined}
      onClick={onClick}
    />
  );
}

/* Reusable rail icon button */

function RailIconButton({
  icon,
  label,
  isActive,
  stripColor,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  stripColor: string;
  badge?: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const handleMouseEnter = () => {
    setHovered(true);
    tooltipTimer.current = setTimeout(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
      }
      setShowTooltip(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  };

  const activeBg = isActive
    ? hexToRgba(stripColor, 0.1)
    : hovered
      ? 'var(--color-surface-2)'
      : 'transparent';

  const isDark = document.documentElement.classList.contains('dark');
  const defaultColor = isDark ? '#D4A017' : stripColor;
  const hoverColor = isDark ? '#F2C94C' : stripColor;
  const iconColor = isActive ? stripColor : hovered ? hoverColor : defaultColor;
  const iconOpacity = isActive ? 1 : isDark ? 0.85 : 0.7;
  const iconHoverOpacity = isActive ? 1 : 1;

  return (
    <div
      style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: stripColor,
          }}
        />
      )}

      <button
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={label}
        title={label}
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: 'none',
          background: activeBg,
          color: iconColor,
          opacity: hovered ? iconHoverOpacity : iconOpacity,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 150ms ease, color 150ms ease, opacity 150ms ease',
          padding: 0,
        }}
      >
        {icon}

        {badge != null && badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: '#CE1126',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translateY(-50%)',
            background: 'var(--color-surface-3)',
            color: 'var(--color-text-primary)',
            fontSize: 11,
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            border: '1px solid var(--color-border-1)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/* Helpers */

function hexToRgba(color: string, alpha: number): string {
  if (color.startsWith('var(')) {
    return `color-mix(in srgb, ${color.replace('var(', '').replace(')', '')} ${Math.round(alpha * 100)}%, transparent)`;
  }
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export default IconRail;
