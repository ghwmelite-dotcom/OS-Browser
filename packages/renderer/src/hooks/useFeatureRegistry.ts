import { useSyncExternalStore, useMemo } from 'react';
import {
  FeatureRegistry,
  FeatureDefinition,
  EnrichedCommand,
} from '../features/registry';

// ── Snapshot cache ──────────────────────────────────────────────────
// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing has changed. We cache the derived arrays
// and only recompute when the underlying Map reference changes.

let cachedMap: Map<string, FeatureDefinition> | null = null;
let cachedAll: FeatureDefinition[] = [];
let cachedCommands: EnrichedCommand[] = [];

function rebuildCacheIfNeeded(): void {
  const current = FeatureRegistry.getSnapshot();
  if (current !== cachedMap) {
    cachedMap = current;
    cachedAll = FeatureRegistry.getAll();
    cachedCommands = FeatureRegistry.getAllCommands();
  }
}

function getAllSnapshot(): FeatureDefinition[] {
  rebuildCacheIfNeeded();
  return cachedAll;
}

function getCommandsSnapshot(): EnrichedCommand[] {
  rebuildCacheIfNeeded();
  return cachedCommands;
}

const subscribe = (cb: () => void) => FeatureRegistry.subscribe(cb);

// ── Hooks ───────────────────────────────────────────────────────────

/**
 * Returns all registered features, sorted by priority then name.
 * Re-renders when features are registered or unregistered.
 */
export function useFeatureRegistry(): FeatureDefinition[] {
  return useSyncExternalStore(subscribe, getAllSnapshot, getAllSnapshot);
}

/**
 * Returns all commands from all features, enriched with feature metadata
 * (featureId, featureName, stripColor, featureIcon).
 * Ideal for powering the command palette.
 */
export function useFeatureCommands(): EnrichedCommand[] {
  return useSyncExternalStore(subscribe, getCommandsSnapshot, getCommandsSnapshot);
}

/**
 * Returns a single feature by id, or undefined if not registered.
 */
export function useFeature(id: string): FeatureDefinition | undefined {
  const features = useFeatureRegistry();
  return useMemo(() => features.find(f => f.id === id), [features, id]);
}
