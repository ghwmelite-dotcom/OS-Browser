import type { GovPortal } from './types';

export const APP_NAME = 'OS Browser';
export const APP_VERSION = '1.0.0';

export const DEFAULT_GOV_PORTALS: Omit<GovPortal, 'id'>[] = [
  { name: 'Ghana.gov', url: 'https://ghana.gov.gh', category: 'General', icon_path: null, position: 0, is_default: true, is_visible: true },
  { name: 'GIFMIS', url: 'https://gifmis.finance.gov.gh', category: 'Finance', icon_path: null, position: 1, is_default: true, is_visible: true },
  { name: 'CAGD Payroll', url: 'https://cagd.gov.gh', category: 'Payroll', icon_path: null, position: 2, is_default: true, is_visible: true },
  { name: 'GRA Tax Portal', url: 'https://gra.gov.gh', category: 'Tax', icon_path: null, position: 3, is_default: true, is_visible: true },
  { name: 'SSNIT', url: 'https://ssnit.org.gh', category: 'Pensions', icon_path: null, position: 4, is_default: true, is_visible: true },
  { name: 'Public Services Commission', url: 'https://psc.gov.gh', category: 'HR', icon_path: null, position: 5, is_default: true, is_visible: true },
  { name: 'Ghana Health Service', url: 'https://ghs.gov.gh', category: 'Health', icon_path: null, position: 6, is_default: true, is_visible: true },
  { name: 'Ministry of Finance', url: 'https://mofep.gov.gh', category: 'Finance', icon_path: null, position: 7, is_default: true, is_visible: true },
  { name: 'OHCS Platform', url: 'https://ohcs.gov.gh', category: 'HR', icon_path: null, position: 8, is_default: true, is_visible: true },
  { name: 'E-SPAR Portal', url: 'https://ohcsgh.web.app', category: 'HR/Appraisal', icon_path: null, position: 9, is_default: true, is_visible: true },
];

export const AD_BLOCK_WHITELIST = [
  '*.gov.gh',
  '*.mil.gh',
  '*.edu.gh',
  'ohcsgh.web.app',
  'askozzy.ghwmelite.workers.dev',
];

export const SEARCH_ENGINES = {
  osbrowser: { name: 'OS Browser AI', url: '' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
} as const;

export const PAGE_CACHE_LIMIT_MB = 500;
export const FTS_RETENTION_DAYS = 90;
export const TAB_SUSPEND_AFTER_MS = 5 * 60 * 1000;
export const MAX_CONCURRENT_TABS = 25;
export const HISTORY_EXCERPT_LENGTH = 500;
