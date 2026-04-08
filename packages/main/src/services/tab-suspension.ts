// DEPRECATED: Use TabLifecycleManager instead. Re-exports for backward compatibility.
export {
  initTabLifecycle as initMemorySaver,
  stopTabLifecycle as stopMemorySaver,
  isTabDiscarded as isTabSuspended,
  getTabLifecycleInfo as getTabSuspendInfo,
  reactivateTab as markTabRestored,
  getTotalMemorySaved,
  getDiscardedTabCount as getSuspendedTabCount,
  addExcludedDomain,
  removeExcludedDomain,
  getExcludedDomains,
} from './TabLifecycleManager';
