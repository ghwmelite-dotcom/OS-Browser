// ── Ad Blocker Injection Scripts ─────────────────────────────────────────────
// Exact copies of the OS Browser desktop ad blocker scripts.
// These get injected into WebViews via `injectedJavaScript` / `injectJavaScript`.

// ── Video Platform Hosts ────────────────────────────────────────────────────

export const VIDEO_PLATFORM_HOSTS = new Set([
  'www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com',
  'www.twitch.tv', 'twitch.tv', 'm.twitch.tv',
  'www.facebook.com', 'facebook.com', 'web.facebook.com',
  'www.instagram.com', 'instagram.com',
  'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
  'www.dailymotion.com', 'dailymotion.com',
  'www.vimeo.com', 'vimeo.com',
]);

// ══════════════════════════════════════════════════════════════════════════════
// YOUTUBE AD BLOCKER
// ══════════════════════════════════════════════════════════════════════════════
const YOUTUBE_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserYTAdBlock) return;
  window.__osBrowserYTAdBlock = true;
  if (!window.__ozzyTimers) window.__ozzyTimers = [];

  // ── Layer 1: Intercept fetch() to strip ad data from YouTube API responses ──
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next') || url.includes('/youtubei/v1/browse')) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        // Strip all ad-related properties
        delete json.adPlacements;
        delete json.adSlots;
        delete json.playerAds;
        delete json.adBreakHeartbeatParams;
        delete json.adBreakParams;
        delete json.attestation;
        if (json.playerConfig) {
          delete json.playerConfig.adRequestConfig;
          delete json.playerConfig.adsRequestConfig;
        }
        if (json.overlay?.autoplay?.autoplayVideoRenderer?.promotedSparkAdRenderer) {
          delete json.overlay.autoplay.autoplayVideoRenderer.promotedSparkAdRenderer;
        }
        // Strip ad markers from streaming data
        if (json.streamingData?.serverAbrStreamingUrl) {
          json.streamingData.serverAbrStreamingUrl = json.streamingData.serverAbrStreamingUrl.replace(/&ctier=L/g, '');
        }
        return new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch { return response; }
    }
    return response;
  };

  // ── Layer 2: Intercept XHR for player requests ──
  const origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string' && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
      this.__ytAdBlockIntercept = true;
    }
    return origXhrOpen.call(this, method, url, ...rest);
  };
  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this.__ytAdBlockIntercept) {
      this.addEventListener('load', function() {
        try {
          const json = JSON.parse(this.responseText);
          delete json.adPlacements;
          delete json.adSlots;
          delete json.playerAds;
          delete json.adBreakHeartbeatParams;
          delete json.adBreakParams;
          Object.defineProperty(this, 'responseText', { value: JSON.stringify(json) });
        } catch {}
      }, { once: true });
    }
    return origXhrSend.apply(this, args);
  };

  // ── Layer 3: Override ytInitialPlayerResponse ──
  try {
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: function() { return _ytInitialPlayerResponse; },
      set: function(val) {
        if (val && typeof val === 'object') {
          delete val.adPlacements;
          delete val.adSlots;
          delete val.playerAds;
          delete val.adBreakHeartbeatParams;
          delete val.adBreakParams;
          delete val.attestation;
        }
        _ytInitialPlayerResponse = val;
      },
      configurable: true,
    });
  } catch {}

  // ── Layer 4: Auto-skip ads with smooth content transition ──
  let wasInAd = false;
  let contentMutedByUs = false;

  const adSkipper = setInterval(() => {
    try {
      const player = document.querySelector('#movie_player');
      const video = document.querySelector('video');
      const isAdShowing = player && (
        player.classList.contains('ad-showing') ||
        !!document.querySelector('.ytp-ad-player-overlay') ||
        !!document.querySelector('.ytp-ad-module .ytp-ad-text')
      );

      if (isAdShowing && video) {
        wasInAd = true;

        // Strategy 1: Click skip button immediately if available
        const skipSelectors = [
          '.ytp-skip-ad-button',
          '.ytp-ad-skip-button',
          '.ytp-ad-skip-button-modern',
          '[id^="skip-button"] button',
          '.ytp-ad-skip-button-slot button',
          'button.ytp-skip-ad-button',
          '.videoAdUiSkipButton',
        ];
        let skipped = false;
        for (const sel of skipSelectors) {
          const btn = document.querySelector(sel);
          if (btn instanceof HTMLElement && btn.offsetParent !== null) {
            btn.click();
            skipped = true;
            break;
          }
        }

        // Strategy 2: If no skip button, mute and fast-forward to end
        if (!skipped) {
          video.muted = true;
          contentMutedByUs = true;
          video.playbackRate = 16;
          if (video.duration && isFinite(video.duration) && video.duration > 0.5) {
            video.currentTime = video.duration - 0.1;
          }
        }

        // Close overlay/banner ads
        const closeSelectors = [
          '.ytp-ad-overlay-close-button',
          '.ytp-ad-overlay-close-container',
          '[id^="dismiss-button"]',
          '.ytp-ad-overlay-close-button button',
        ];
        for (const sel of closeSelectors) {
          const el = document.querySelector(sel);
          if (el instanceof HTMLElement) el.click();
        }

      } else if (wasInAd && video) {
        // ── Ad just ended — restore normal playback smoothly ──
        wasInAd = false;
        video.playbackRate = 1;
        if (contentMutedByUs) {
          video.muted = false;
          contentMutedByUs = false;
        }
        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
        if (player && player.classList.contains('ad-interrupting')) {
          const skipAny = document.querySelector('[class*="skip"]');
          if (skipAny instanceof HTMLElement) skipAny.click();
        }
      }

      // Always close overlay ads even when not in a video ad
      if (!isAdShowing) {
        const overlay = document.querySelector('.ytp-ad-overlay-container');
        if (overlay instanceof HTMLElement && overlay.children.length > 0) {
          const close = overlay.querySelector('[class*="close"]');
          if (close instanceof HTMLElement) close.click();
          else overlay.style.display = 'none';
        }
      }
    } catch {}
  }, 200);
  window.__ozzyTimers.push(adSkipper);

  // ── Layer 4b: MutationObserver for instant ad detection ──
  try {
    const playerObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
        const target = mutation.target;
        if (!(target instanceof HTMLElement) || target.id !== 'movie_player') continue;
        if (target.classList.contains('ad-showing')) {
          const video = document.querySelector('video');
          if (!video) return;
          const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
          if (skipBtn instanceof HTMLElement) {
            skipBtn.click();
          } else {
            video.muted = true;
            contentMutedByUs = true;
            video.playbackRate = 16;
            if (video.duration && isFinite(video.duration) && video.duration > 0.5) {
              video.currentTime = video.duration - 0.1;
            }
          }
        }
      }
    });
    const waitForPlayer = setInterval(() => {
      const mp = document.querySelector('#movie_player');
      if (mp) {
        clearInterval(waitForPlayer);
        playerObserver.observe(mp, { attributes: true, attributeFilter: ['class'] });
      }
    }, 500);
    window.__ozzyTimers.push(waitForPlayer);
    setTimeout(() => clearInterval(waitForPlayer), 30000);
  } catch {}

  // ── Layer 5: Block ad script loading ──
  try {
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function(tag, options) {
      const el = origCreateElement(tag, options);
      if (tag.toLowerCase() === 'script') {
        const origSetAttr = el.setAttribute.bind(el);
        el.setAttribute = function(name, value) {
          if (name === 'src' && typeof value === 'string') {
            const adDomains = ['googlesyndication.com', 'doubleclick.net', 'youtube.com/pagead/', 's0.2mdn.net', 'pagead2.googlesyndication.com'];
            if (adDomains.some(d => value.includes(d))) {
              return; // Block the ad script from loading
            }
          }
          return origSetAttr(name, value);
        };
      }
      return el;
    };
  } catch {}

  // ── Layer 6: Suppress anti-adblock detection ──
  try {
    Object.defineProperty(window, 'adBlocksFound', { configurable: true, get() { return 0; }, set() {} });
    Object.defineProperty(window, 'hasAdBlocker', { configurable: true, get() { return false; }, set() {} });
  } catch {}

  // ── Layer 7: CSS cosmetic hiding of YouTube ad elements ──
  const style = document.createElement('style');
  style.textContent = [
    'ytd-ad-slot-renderer',
    'ytd-banner-promo-renderer',
    'ytd-companion-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-promoted-video-renderer',
    'ytd-statement-banner-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    'ytd-merch-shelf-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-movie-offer-module-renderer',
    'ytd-brand-video-singleton-renderer',
    'ytd-brand-video-shelf-renderer',
    '#player-ads',
    '#masthead-ad',
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-progress',
    '.ytp-ad-progress-list',
    '.ytp-ad-skip-button-slot',
    '#player-overlay\\\\:1',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    'div#player-ads.style-scope.ytd-watch-flexy',
    'div#panels.style-scope.ytd-watch-flexy > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    '[layout="compact-promoted-item"]',
    // YouTube Shorts ads
    'ytd-reel-video-renderer[is-ad]',
    'ytd-reel-video-renderer:has(ytd-ad-slot-renderer)',
    // YouTube Music ads
    'ytmusic-mealbar-promo-renderer',
    'ytmusic-statement-banner-renderer',
    // YouTube Premium subscription nags
    'ytd-mealbar-promo-renderer',
    'tp-yt-paper-dialog:has(#mealbar-promo-renderer)',
    'ytd-popup-container:has(a[href*="premium"])',
    'ytd-enforcement-message-view-model',
    // Sponsored cards in recommendations
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-ad-slot-renderer',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  window.addEventListener('unload', function() { clearInterval(adSkipper); (window.__ozzyTimers || []).forEach(clearInterval); }, { once: true });
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// TWITCH AD BLOCKER
// ══════════════════════════════════════════════════════════════════════════════
const TWITCH_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserTwitchAdBlock) return;
  window.__osBrowserTwitchAdBlock = true;

  let lastContentSegmentUrl = '';

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    try {
      if (url.includes('spade.twitch.tv')) {
        return new Response('', { status: 204 });
      }
    } catch {}

    if (url.includes('.m3u8')) {
      const response = await originalFetch.apply(this, args);
      try {
        const text = await response.clone().text();
        if (text.includes('stitched-ad') || text.includes('twitch-ad') || text.includes('Amazon-Ads')) {
          const lines = text.split('\\n');
          const cleaned = [];
          let skipSegment = false;
          let adSegmentCount = 0;
          for (const line of lines) {
            if (line.trim().startsWith('http') && !line.includes('stitched-ad') && !line.includes('twitch-ad') && !line.includes('Amazon-Ads') && line.includes('.ts')) {
              lastContentSegmentUrl = line.trim();
            }
          }
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('stitched-ad') || line.includes('twitch-ad') || line.includes('Amazon-Ads')) {
              skipSegment = true;
              continue;
            }
            if (skipSegment && line.startsWith('#EXTINF')) {
              if (lastContentSegmentUrl) {
                cleaned.push(line);
                if (i + 1 < lines.length && lines[i + 1].trim().startsWith('http')) {
                  cleaned.push(lastContentSegmentUrl);
                  i++;
                  adSegmentCount++;
                }
              }
              continue;
            }
            if (skipSegment && line.trim().startsWith('http')) {
              if (lastContentSegmentUrl) {
                cleaned.push(lastContentSegmentUrl);
                adSegmentCount++;
              }
              skipSegment = false;
              continue;
            }
            skipSegment = false;
            cleaned.push(line);
          }
          return new Response(cleaned.join('\\n'), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
        return response;
      } catch { return response; }
    }

    if (url.includes('gql.twitch.tv')) {
      const response = await originalFetch.apply(this, args);
      try {
        const clone = response.clone();
        const json = await clone.json();
        const strip = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          delete obj.adBreak;
          delete obj.adDisplayProperties;
          delete obj.adServerURL;
          delete obj.stitchedAdPod;
          if (Array.isArray(obj)) obj.forEach(strip);
          else Object.values(obj).forEach(v => { if (typeof v === 'object') strip(v); });
        };
        strip(json);
        return new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch { return response; }
    }

    return originalFetch.apply(this, args);
  };

  let twitchWasInAd = false;
  let twitchMutedByUs = false;

  const adWatcher = setInterval(() => {
    try {
      const adOverlay = document.querySelector('[data-a-target="video-ad-label"], .stream-display-ad__container, [data-test-selector="sad-overlay"]');
      const video = document.querySelector('video');

      if (adOverlay && video) {
        twitchWasInAd = true;
        if (!video.muted) {
          video.muted = true;
          twitchMutedByUs = true;
        }
        if (video.duration && isFinite(video.duration) && video.duration > 1) {
          video.currentTime = video.duration - 0.1;
        }
        video.playbackRate = 16;
      } else if (twitchWasInAd && video) {
        twitchWasInAd = false;
        video.playbackRate = 1;
        if (twitchMutedByUs) {
          video.muted = false;
          twitchMutedByUs = false;
        }
        if (video.paused) {
          video.play().catch(() => {});
        }
      }

      const closeBtn = document.querySelector('[data-a-target="video-ad-close-button"], .tw-absolute button[aria-label="Close"]');
      if (closeBtn instanceof HTMLElement) closeBtn.click();
    } catch {}
  }, 200);

  const style = document.createElement('style');
  style.textContent = [
    '.stream-display-ad__container',
    '.video-ad-overlay',
    '[data-a-target="video-ad-label"]',
    '[data-a-target="video-ad-countdown"]',
    '[data-test-selector="sad-overlay"]',
    '.tw-absolute [class*="ad-banner"]',
    '[class*="ScAdContainer"]',
    '[data-a-target="ad-countdown-timer"]',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  window.addEventListener('unload', () => clearInterval(adWatcher), { once: true });
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// FACEBOOK / INSTAGRAM AD BLOCKER
// ══════════════════════════════════════════════════════════════════════════════
const FACEBOOK_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserFBAdBlock) return;
  window.__osBrowserFBAdBlock = true;

  const style = document.createElement('style');
  style.textContent = [
    '[data-ad-rendering-role]',
    '[data-ad-preview]',
    '[aria-label="Sponsored"]',
    'div[data-pagelet*="FeedUnit"]:has([aria-label="Sponsored"])',
    'div[data-pagelet*="FeedUnit"]:has(a[href*="/ads/"])',
    'div[role="article"]:has([aria-label="Sponsored"])',
    'article:has([class*="Sponsored"])',
    '[class*="SponsoredLabel"]',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  const sponsoredTexts = ['Sponsored', 'Gesponsert', 'Sponsoris\\u00e9', 'Patrocinado', 'Bersponsor', '\\u5e7f\\u544a', '\\u30b9\\u30dd\\u30f3\\u30b5\\u30fc'];

  function isSponsoredPost(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (node.querySelector('[data-ad-rendering-role], [data-ad-preview], [aria-label="Sponsored"]')) return true;
    const links = node.querySelectorAll('a[href*="/ads/about"], a[href*="ad_id="], span[class]');
    for (const link of links) {
      const text = link.textContent?.trim();
      if (text && sponsoredTexts.includes(text)) return true;
    }
    return false;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const articles = node.matches('[role="article"]') ? [node] : Array.from(node.querySelectorAll('[role="article"]'));
        for (const article of articles) {
          if (isSponsoredPost(article)) {
            article.style.display = 'none';
            const videos = article.querySelectorAll('video');
            videos.forEach(v => { v.pause(); v.muted = true; v.src = ''; });
          }
        }
      }
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.addEventListener('unload', () => observer.disconnect(), { once: true });
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// TWITTER / X AD BLOCKER
// ══════════════════════════════════════════════════════════════════════════════
const TWITTER_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserTwitterAdBlock) return;
  window.__osBrowserTwitterAdBlock = true;

  const style = document.createElement('style');
  style.textContent = [
    'article:has([data-testid="promotedIndicator"])',
    'div[data-testid="placementTracking"]',
    '[data-testid="tweet"]:has([data-testid="promotedIndicator"])',
    'aside[role="complementary"]:has([data-testid="promotedIndicator"])',
    '[data-testid="trend"]:has([data-testid="promotedIndicator"])',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('/graphql') || url.includes('/i/api/graphql')) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        const stripPromoted = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) {
            return obj.filter(item => {
              if (item?.promotedMetadata || item?.content?.promotedMetadata) return false;
              if (item?.entryId && typeof item.entryId === 'string' && item.entryId.includes('promoted')) return false;
              return true;
            }).map(stripPromoted);
          }
          const result = {};
          for (const [key, val] of Object.entries(obj)) {
            if (key === 'promotedMetadata') continue;
            result[key] = stripPromoted(val);
          }
          return result;
        };
        const cleaned = stripPromoted(json);
        return new Response(JSON.stringify(cleaned), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch { return response; }
    }
    return originalFetch.apply(this, args);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const articles = node.matches('article') ? [node] : Array.from(node.querySelectorAll('article'));
        for (const article of articles) {
          if (article.querySelector('[data-testid="promotedIndicator"]')) {
            article.style.display = 'none';
            const videos = article.querySelectorAll('video');
            videos.forEach(v => { v.pause(); v.muted = true; });
          }
        }
      }
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.addEventListener('unload', () => observer.disconnect(), { once: true });
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// DAILYMOTION AD BLOCKER
// ══════════════════════════════════════════════════════════════════════════════
const DAILYMOTION_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserDMAdBlock) return;
  window.__osBrowserDMAdBlock = true;

  const EMPTY_VAST = '<VAST version="3.0"/>';
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('ad.dailymotion.com') || url.includes('/vast') || url.includes('ads.dailymotion.com')) {
      return new Response(EMPTY_VAST, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
    return originalFetch.apply(this, args);
  };

  const origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string' && (url.includes('ad.dailymotion.com') || url.includes('ads.dailymotion.com'))) {
      this.__dmAdBlocked = true;
    }
    return origXhrOpen.call(this, method, url, ...rest);
  };
  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this.__dmAdBlocked) {
      Object.defineProperty(this, 'responseText', { value: EMPTY_VAST });
      Object.defineProperty(this, 'status', { value: 200 });
      Object.defineProperty(this, 'readyState', { value: 4 });
      this.dispatchEvent(new Event('load'));
      return;
    }
    return origXhrSend.apply(this, args);
  };

  try {
    let _playerConfig = window.__PLAYER_CONFIG__;
    Object.defineProperty(window, '__PLAYER_CONFIG__', {
      get() { return _playerConfig; },
      set(val) {
        if (val && typeof val === 'object') {
          val.advertising = false;
          if (val.ads) val.ads = {};
        }
        _playerConfig = val;
      },
      configurable: true,
    });
  } catch {}

  const style = document.createElement('style');
  style.textContent = [
    '.dmp_AdvertisingModule',
    '.dmp_Advancement',
    '[class*="AdOverlay"]',
    '.dmp_VideoAd',
    '[class*="ad-overlay"]',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);
})();
`;

// ── Host matching helpers ───────────────────────────────────────────────────

function isYouTube(hostname: string): boolean {
  return hostname === 'www.youtube.com' || hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' || hostname === 'music.youtube.com';
}

function isTwitch(hostname: string): boolean {
  return hostname === 'www.twitch.tv' || hostname === 'twitch.tv' || hostname === 'm.twitch.tv';
}

function isFacebook(hostname: string): boolean {
  return hostname === 'www.facebook.com' || hostname === 'facebook.com' ||
    hostname === 'web.facebook.com' || hostname === 'www.instagram.com' ||
    hostname === 'instagram.com';
}

function isTwitter(hostname: string): boolean {
  return hostname === 'twitter.com' || hostname === 'www.twitter.com' ||
    hostname === 'x.com' || hostname === 'www.x.com';
}

function isDailymotion(hostname: string): boolean {
  return hostname === 'www.dailymotion.com' || hostname === 'dailymotion.com';
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC AD BLOCKER — runs on ALL websites
// ══════════════════════════════════════════════════════════════════════════════
const GENERIC_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserGenericAdBlock) return;
  window.__osBrowserGenericAdBlock = true;

  // ── 1. CSS: Hide common ad containers, popups, overlays ──
  const style = document.createElement('style');
  style.textContent = [
    // Common ad containers
    'ins.adsbygoogle',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="googleadservices"]',
    'iframe[src*="ads"]',
    'iframe[id*="google_ads"]',
    'div[id*="google_ads"]',
    'div[class*="ad-container"]',
    'div[class*="ad-wrapper"]',
    'div[class*="ad-banner"]',
    'div[class*="adunit"]',
    'div[class*="ad-slot"]',
    'div[class*="ad_slot"]',
    'div[class*="advertisement"]',
    'div[class*="sponsored"]',
    'div[data-ad]',
    'div[data-ad-slot]',
    'div[data-google-query-id]',
    'div[aria-label="advertisement"]',
    // Popup overlays
    'div[class*="popup"]',
    'div[class*="modal"][class*="ad"]',
    'div[class*="overlay"][class*="ad"]',
    'div[id*="popup"]',
    // Sticky bottom/top bars
    'div[class*="sticky-ad"]',
    'div[class*="fixed-ad"]',
    'div[class*="floating-ad"]',
    // Common ad network containers
    '.mgbox', '.mgline',
    '[id^="taboola"]',
    '[id^="outbrain"]',
    '[class*="taboola"]',
    '[class*="outbrain"]',
    '[class*="mgid"]',
    '[class*="propeller"]',
    'a-ads',
    // Video player overlay ads
    'div[class*="vast"]',
    'div[class*="vpaid"]',
    'div[class*="preroll"]',
    'div[class*="midroll"]',
    'div[class*="video-ad"]',
    '.vjs-ad-playing .vjs-ad-overlay',
    // Sports streaming site common patterns
    'div[class*="bet"]',
    'div[class*="casino"]',
    'a[href*="bet365"]',
    'a[href*="1xbet"]',
    'a[href*="betway"]',
    'a[href*="stake.com"]',
    'a[href*="casino"]',
    'a[href*="betting"]',
    'div[onclick*="window.open"]',
  ].join(', ') + ' { display: none !important; visibility: hidden !important; height: 0 !important; min-height: 0 !important; max-height: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
  document.head.appendChild(style);

  // ── 2. Block popup windows / new tabs opened by ads ──
  const origOpen = window.open;
  window.open = function(url, target, features) {
    if (!url) return null;
    const urlStr = String(url).toLowerCase();
    const adDomains = ['doubleclick','googlesyndication','googleadservices','adnxs','taboola','outbrain',
      'mgid','propellerads','popads','popcash','adsterra','1xbet','bet365','betway','stake.com',
      'casino','betting','track','click','redirect','adf.ly'];
    if (adDomains.some(d => urlStr.includes(d))) return null;
    // Block blank popup opens from click handlers (common ad trick)
    if (target === '_blank' && !url.startsWith(window.location.origin)) {
      // Allow only if user explicitly clicked a real link
      return null;
    }
    return origOpen.call(this, url, target, features);
  };

  // ── 3. Block ad network scripts from loading ──
  const origCreateElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    const el = origCreateElement(tag);
    if (tag.toLowerCase() === 'script') {
      const origSetAttr = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          const blocked = ['doubleclick.net','googlesyndication.com','googleadservices.com',
            'adnxs.com','taboola.com','outbrain.com','mgid.com','propellerads.com',
            'popads.net','popcash.net','adsterra.com','juicyads.com','exoclick.com',
            'trafficjunky.com','clickadu.com','hilltopads.com','pushground.com',
            'richpush.com','evadav.com','galaksion.com','bidvertiser.com'];
          if (blocked.some(d => value.includes(d))) {
            origSetAttr.call(this, 'data-blocked', 'true');
            origSetAttr.call(this, name, 'about:blank');
            return;
          }
        }
        return origSetAttr.call(this, name, value);
      };
    }
    return el;
  };

  // ── 4. MutationObserver: Remove ads injected after page load ──
  const observer = new MutationObserver(function(mutations) {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        const el = node;
        const tag = (el.tagName || '').toLowerCase();

        // Block ad iframes
        if (tag === 'iframe') {
          const src = el.getAttribute('src') || '';
          if (src.includes('doubleclick') || src.includes('googlesyndication') ||
              src.includes('adnxs') || src.includes('ads') || src.includes('taboola') ||
              src.includes('popads') || src.includes('casino') || src.includes('bet')) {
            el.remove();
            continue;
          }
        }

        // Block popup divs with inline onclick window.open
        if (el.getAttribute && el.getAttribute('onclick') && String(el.getAttribute('onclick')).includes('window.open')) {
          el.removeAttribute('onclick');
        }

        // Block elements with ad-related classes added dynamically
        const cls = el.className || '';
        if (typeof cls === 'string' && (cls.includes('ad-') || cls.includes('ads-') || cls.includes('popup') ||
            cls.includes('overlay') || cls.includes('modal'))) {
          if (cls.includes('ad-container') || cls.includes('ad-wrapper') || cls.includes('ad-banner') ||
              cls.includes('popup-ad') || cls.includes('overlay-ad')) {
            el.style.display = 'none';
          }
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // ── 5. Block scam popups (fake missed calls, prizes, virus warnings) ──
  const origAlert = window.alert;
  const origConfirm = window.confirm;
  const origPrompt = window.prompt;
  const scamKeywords = ['missed call','prize','congratulation','winner','virus','infected',
    'battery','malware','reward','gift card','claim','lottery','urgent','warning'];

  window.alert = function(msg) {
    if (scamKeywords.some(k => String(msg).toLowerCase().includes(k))) return;
    return origAlert.call(this, msg);
  };
  window.confirm = function(msg) {
    if (scamKeywords.some(k => String(msg).toLowerCase().includes(k))) return false;
    return origConfirm.call(this, msg);
  };
  window.prompt = function(msg) {
    if (scamKeywords.some(k => String(msg).toLowerCase().includes(k))) return null;
    return origPrompt.call(this, msg);
  };

  // ── 6. Aggressively remove scam/ad overlays every 2 seconds ──
  const cleanupInterval = setInterval(function() {
    // Remove fixed/absolute positioned overlays that look like ads
    document.querySelectorAll('div, section, aside').forEach(function(el) {
      const style = window.getComputedStyle(el);
      if ((style.position === 'fixed' || style.position === 'absolute') &&
          parseInt(style.zIndex || '0') > 999) {
        const text = (el.textContent || '').toLowerCase();
        if (scamKeywords.some(k => text.includes(k)) ||
            text.includes('play video') || text.includes('click here') ||
            text.includes('continue') || text.includes('close') && el.offsetHeight < 300) {
          el.remove();
        }
      }
    });

    // Remove iframes that appeared after load
    document.querySelectorAll('iframe').forEach(function(iframe) {
      const src = iframe.src || '';
      if (!src || src === 'about:blank' || src.includes('ad') || src.includes('pop') ||
          src.includes('click') || src.includes('track') || src.includes('bet') ||
          src.includes('casino') || !src.includes(window.location.hostname)) {
        const style = window.getComputedStyle(iframe);
        if (style.position === 'fixed' || style.position === 'absolute' ||
            parseInt(style.zIndex || '0') > 100) {
          iframe.remove();
        }
      }
    });
  }, 2000);

  // ── 7. Neutralize common anti-adblock detection ──
  Object.defineProperty(window, 'adBlockDetected', { get: () => false, set: () => {} });
  Object.defineProperty(window, 'canRunAds', { get: () => true, set: () => {} });

  window.addEventListener('unload', function() { observer.disconnect(); clearInterval(cleanupInterval); }, { once: true });
})();
`;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the appropriate ad-block injection script for the given hostname.
 * Platform-specific blockers are prepended to the generic blocker for maximum coverage.
 */
export function getAdBlockScript(hostname: string): string | null {
  let platformScript = '';
  if (isYouTube(hostname)) platformScript = YOUTUBE_AD_BLOCK_SCRIPT;
  else if (isTwitch(hostname)) platformScript = TWITCH_AD_BLOCK_SCRIPT;
  else if (isFacebook(hostname)) platformScript = FACEBOOK_AD_BLOCK_SCRIPT;
  else if (isTwitter(hostname)) platformScript = TWITTER_AD_BLOCK_SCRIPT;
  else if (isDailymotion(hostname)) platformScript = DAILYMOTION_AD_BLOCK_SCRIPT;

  // Always return generic blocker + platform-specific if available
  return platformScript + GENERIC_AD_BLOCK_SCRIPT;
}

/** Check whether the given hostname is a known video/social platform. */
export function isVideoHost(hostname: string): boolean {
  return VIDEO_PLATFORM_HOSTS.has(hostname);
}
