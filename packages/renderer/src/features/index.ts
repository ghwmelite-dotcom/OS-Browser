// ── Feature Definitions ─────────────────────────────────────────────
// Importing each file triggers its self-registration via FeatureRegistry.register()
import './definitions/data-saver';
import './definitions/gov-hub';
import './definitions/ghana-card';
import './definitions/offline-library';
import './definitions/documents';
import './definitions/translation';
import './definitions/dumsor-guard';
import './definitions/messenger';
import './definitions/ai-assistant';
import './definitions/mobile-money';
import './definitions/screenshot';
import './definitions/network-manager';
import './definitions/govplay';

// ── Re-exports ──────────────────────────────────────────────────────
import { FeatureRegistry as _Registry } from './registry';
export { FeatureRegistry, FEATURE_CATEGORIES } from './registry';
export type {
  FeatureDefinition,
  FeatureCategory,
  StatusBarConfig,
  SidebarConfig,
  ToolbarConfig,
  CommandConfig,
  EnrichedCommand,
  StatusBarIndicatorProps,
  SidebarPanelProps,
  ToolbarDropdownItem,
} from './registry';

// ── Initialization ──────────────────────────────────────────────────
let initialized = false;

/**
 * Initialize the Kente Feature System.
 * Safe to call multiple times — only runs once.
 *
 * All 12 feature definitions are imported above, which triggers
 * their self-registration. This function exists as an explicit
 * initialization point that app entry code can call.
 */
export function initializeFeatures(): void {
  if (initialized) return;
  initialized = true;

  const count = _Registry.getAll().length;
  console.log(`[Kente] Feature system initialized with ${count} features`);
}
