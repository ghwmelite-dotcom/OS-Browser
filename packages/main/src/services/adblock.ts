import { session } from 'electron';
import { AD_BLOCK_WHITELIST } from '@os-browser/shared';

// Simplified ad-blocking patterns (subset of EasyList)
const AD_PATTERNS = [
  /doubleclick\.net/i, /googlesyndication\.com/i, /googleadservices\.com/i,
  /google-analytics\.com/i, /googletagmanager\.com/i, /googletagservices\.com/i,
  /facebook\.net.*\/signals/i, /connect\.facebook\.net.*\/fbevents/i,
  /adsbygoogle/i, /pagead2\.googlesyndication/i,
  /amazon-adsystem\.com/i, /ads\.yahoo\.com/i,
  /adnxs\.com/i, /adsrvr\.org/i, /adform\.net/i,
  /criteo\.com/i, /criteo\.net/i,
  /outbrain\.com/i, /taboola\.com/i,
  /scorecardresearch\.com/i, /quantserve\.com/i,
  /hotjar\.com/i, /mouseflow\.com/i,
  /newrelic\.com/i, /nr-data\.net/i,
  /tracking\./i, /tracker\./i, /pixel\./i,
  /\.ads\./i, /\/ads\//i, /\/adserver/i,
  /\/banner[s]?\//i, /\/sponsor/i,
];

const TRACKER_PATTERNS = [
  /google-analytics\.com/i, /googletagmanager\.com/i,
  /facebook\.net.*\/signals/i, /hotjar\.com/i,
  /mouseflow\.com/i, /scorecardresearch\.com/i,
  /quantserve\.com/i, /tracking\./i, /tracker\./i,
];

function isWhitelisted(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return AD_BLOCK_WHITELIST.some(pattern => {
      if (pattern.startsWith('*.')) {
        return hostname.endsWith(pattern.slice(1));
      }
      return hostname === pattern;
    });
  } catch {
    return false;
  }
}

let totalAdsBlocked = 0;
let totalTrackersBlocked = 0;

export function initAdBlocker(): void {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const { url } = details;

    // Skip whitelisted domains
    if (isWhitelisted(url)) {
      callback({});
      return;
    }

    // Check against ad patterns
    const isAd = AD_PATTERNS.some(p => p.test(url));
    const isTracker = TRACKER_PATTERNS.some(p => p.test(url));

    if (isAd || isTracker) {
      if (isAd) totalAdsBlocked++;
      if (isTracker) totalTrackersBlocked++;
      callback({ cancel: true });
      return;
    }

    callback({});
  });
}

export function getAdBlockStats() {
  return { ads_blocked: totalAdsBlocked, trackers_blocked: totalTrackersBlocked };
}
