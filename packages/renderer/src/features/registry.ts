import { LucideIcon, Shield, Landmark, Briefcase, MessageCircle, Wallet, Sparkles } from 'lucide-react';
import React from 'react';

// ── Category Type ───────────────────────────────────────────────────
export type FeatureCategory =
  | 'infrastructure'
  | 'government'
  | 'productivity'
  | 'communication'
  | 'finance'
  | 'intelligence';

// ── Surface Component Props ─────────────────────────────────────────
export interface StatusBarIndicatorProps {
  stripColor: string;
  onClick: () => void;
}

export interface SidebarPanelProps {
  width: number;
  stripColor: string;
  onClose: () => void;
}

// ── Surface Configs ─────────────────────────────────────────────────
export interface StatusBarConfig {
  component: React.ComponentType<StatusBarIndicatorProps>;
  position: 'left' | 'right';
  order: number;
  minWidth?: number;
}

export interface SidebarConfig {
  panelComponent: React.ComponentType<SidebarPanelProps>;
  order: number;
  getBadgeCount?: () => number;
  defaultPanelWidth?: number;
}

export interface ToolbarDropdownItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  onClick: () => void;
}

export interface ToolbarConfig {
  icon: LucideIcon;
  label: string;
  order: number;
  onClick: () => void;
  getIsActive?: () => boolean;
  showCondition?: (url: string) => boolean;
  dropdownItems?: ToolbarDropdownItem[];
}

export interface CommandConfig {
  id: string;
  label: string;
  description?: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
  group?: string;
}

// ── Feature Definition ──────────────────────────────────────────────
export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  stripColor: string;
  icon: LucideIcon;
  category: FeatureCategory;
  surfaces: {
    statusBar?: StatusBarConfig;
    sidebar?: SidebarConfig;
    toolbar?: ToolbarConfig;
    commandBar?: CommandConfig[];
  };
  shortcut?: string;
  requiresSetup?: boolean;
  defaultEnabled?: boolean;
  priority?: number;
  internalPageUrl?: string;
}

// ── Enriched Command (for hooks) ────────────────────────────────────
export interface EnrichedCommand extends CommandConfig {
  featureId: string;
  featureName: string;
  stripColor: string;
  featureIcon: LucideIcon;
}

// ── Category Metadata ───────────────────────────────────────────────
export const FEATURE_CATEGORIES: Record<FeatureCategory, {
  label: string;
  description: string;
  icon: LucideIcon;
  sortOrder: number;
}> = {
  infrastructure: {
    label: 'Infrastructure',
    description: 'Network, data, and power management',
    icon: Shield,
    sortOrder: 1,
  },
  government: {
    label: 'Government',
    description: 'Government services and identity',
    icon: Landmark,
    sortOrder: 2,
  },
  productivity: {
    label: 'Productivity',
    description: 'Documents, offline access, and tools',
    icon: Briefcase,
    sortOrder: 3,
  },
  communication: {
    label: 'Communication',
    description: 'Messaging and translation',
    icon: MessageCircle,
    sortOrder: 4,
  },
  finance: {
    label: 'Finance',
    description: 'Mobile money and payments',
    icon: Wallet,
    sortOrder: 5,
  },
  intelligence: {
    label: 'Intelligence',
    description: 'AI-powered assistance',
    icon: Sparkles,
    sortOrder: 6,
  },
};

// ── Registry Class ──────────────────────────────────────────────────
class FeatureRegistryClass {
  private features: Map<string, FeatureDefinition> = new Map();
  private listeners: Set<() => void> = new Set();

  /** Register a feature definition. Overwrites if id already exists. */
  register(feature: FeatureDefinition): void {
    this.features.set(feature.id, feature);
    this.notify();
  }

  /** Remove a feature by id. Returns true if it existed. */
  unregister(id: string): boolean {
    const deleted = this.features.delete(id);
    if (deleted) this.notify();
    return deleted;
  }

  /** Get all registered features, sorted by priority (desc) then name. */
  getAll(): FeatureDefinition[] {
    return Array.from(this.features.values()).sort((a, b) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pb !== pa) return pb - pa;
      return a.name.localeCompare(b.name);
    });
  }

  /** Get a single feature by id. */
  get(id: string): FeatureDefinition | undefined {
    return this.features.get(id);
  }

  /** Get features that have a specific surface configured. */
  getForSurface(surface: keyof FeatureDefinition['surfaces']): FeatureDefinition[] {
    return this.getAll().filter(f => f.surfaces[surface] != null);
  }

  /** Get features by category. */
  getByCategory(category: FeatureCategory): FeatureDefinition[] {
    return this.getAll().filter(f => f.category === category);
  }

  /** Collect all commands from all features, enriched with feature metadata. */
  getAllCommands(): EnrichedCommand[] {
    const commands: EnrichedCommand[] = [];
    for (const feature of this.getAll()) {
      if (feature.surfaces.commandBar) {
        for (const cmd of feature.surfaces.commandBar) {
          commands.push({
            ...cmd,
            featureId: feature.id,
            featureName: feature.name,
            stripColor: feature.stripColor,
            featureIcon: feature.icon,
          });
        }
      }
    }
    return commands;
  }

  /** Subscribe to registry changes (for useSyncExternalStore). Returns unsubscribe fn. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Snapshot for useSyncExternalStore — returns the features Map reference. */
  getSnapshot(): Map<string, FeatureDefinition> {
    return this.features;
  }

  private notify(): void {
    // Create new Map reference so React detects the change
    this.features = new Map(this.features);
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const FeatureRegistry = new FeatureRegistryClass();
