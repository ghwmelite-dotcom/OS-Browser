import { app, session, ipcMain, WebContents } from 'electron';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/database';

// ── Filter list URLs ────────────────────────────────────────────────────────
// Brave-level filter lists — blocks ads without breaking login/auth flows.
// Removed fanboy-annoyance.txt as it blocks social login widgets and OAuth popups.
const FILTER_LIST_URLS = [
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext',
  // uBlock Origin filter sets — actively maintained, strong video ad coverage
  'https://ublockorigin.github.io/uAssets/filters/filters.txt',
  'https://ublockorigin.github.io/uAssets/filters/filters-2024.txt',
  'https://ublockorigin.github.io/uAssets/filters/badware.txt',
];

// Hostnames where aggressive video/content ad blocking is applied
const VIDEO_PLATFORM_HOSTS = new Set([
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
  // Tracks whether we're currently handling an ad to avoid flickering
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
        if (!wasInAd) {
          // ── Ad just started — freeze the last content frame to prevent dark flash ──
          // Hide the video element and show a frozen poster frame instead
          video.style.opacity = '0';
          video.style.pointerEvents = 'none';
          // Add a dark overlay to mask any brief flicker
          if (!document.getElementById('__ozzy-ad-mask')) {
            const mask = document.createElement('div');
            mask.id = '__ozzy-ad-mask';
            mask.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#0f0f0f;z-index:9998;pointer-events:none;';
            player?.appendChild(mask);
          }
        }
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
          // Jump near the end — not to 9999 which can stall the player
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

        // Restore normal playback rate
        video.playbackRate = 1;

        // Unmute only if we were the ones who muted it
        if (contentMutedByUs) {
          video.muted = false;
          contentMutedByUs = false;
        }

        // Ensure the video is actually playing (not stalled after ad skip)
        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }

        // If the player still has ad residue classes, force-click through
        if (player && player.classList.contains('ad-interrupting')) {
          const skipAny = document.querySelector('[class*="skip"]');
          if (skipAny instanceof HTMLElement) skipAny.click();
        }

        // ── Smooth reveal: fade the video back in after a brief delay ──
        // Wait 100ms for the player to settle on the real content, then crossfade
        setTimeout(() => {
          video.style.transition = 'opacity 200ms ease-in';
          video.style.opacity = '1';
          video.style.pointerEvents = '';
          // Remove the dark mask with a fade
          const mask = document.getElementById('__ozzy-ad-mask');
          if (mask) {
            mask.style.transition = 'opacity 200ms ease-out';
            mask.style.opacity = '0';
            setTimeout(() => mask.remove(), 200);
          }
          // Clean up transition after it completes
          setTimeout(() => { video.style.transition = ''; }, 250);
        }, 100);
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
  // The interval above catches most cases, but this observer reacts
  // INSTANTLY when YouTube adds the 'ad-showing' class to #movie_player,
  // eliminating even the 200ms polling gap.
  try {
    const playerObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
        const target = mutation.target;
        if (!(target instanceof HTMLElement) || target.id !== 'movie_player') continue;
        if (target.classList.contains('ad-showing')) {
          // Ad just appeared — immediately hide video and try to skip
          const video = document.querySelector('video');
          if (!video) return;
          // Instantly hide video to prevent dark flash
          video.style.opacity = '0';
          video.style.pointerEvents = 'none';
          if (!document.getElementById('__ozzy-ad-mask')) {
            const mask = document.createElement('div');
            mask.id = '__ozzy-ad-mask';
            mask.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#0f0f0f;z-index:9998;pointer-events:none;';
            target.appendChild(mask);
          }
          wasInAd = true;
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
    // Start observing once #movie_player exists
    const waitForPlayer = setInterval(() => {
      const mp = document.querySelector('#movie_player');
      if (mp) {
        clearInterval(waitForPlayer);
        playerObserver.observe(mp, { attributes: true, attributeFilter: ['class'] });
      }
    }, 500);
    window.__ozzyTimers.push(waitForPlayer);
    // Stop looking after 30s if player never appears
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
// YOUTUBE SAFE AD BLOCKER (no response tampering — safe from anti-adblock)
// Uses only: auto-skip, MutationObserver, CSS cosmetic hiding, ad script blocking
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// YOUTUBE MINIMAL AD BLOCKER — CSS + auto-skip ONLY, zero JS interception
// This is the only approach YouTube doesn't detect and break.
// ══════════════════════════════════════════════════════════════════════════════
const YOUTUBE_MINIMAL_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserYTMinimal) return;
  window.__osBrowserYTMinimal = true;

  // ── CSS: hide ad UI + make ads invisible while they play ──
  const style = document.createElement('style');
  style.textContent = [
    // Hide ad containers in feed/sidebar
    'ytd-ad-slot-renderer', 'ytd-banner-promo-renderer', 'ytd-companion-slot-renderer',
    'ytd-display-ad-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer', 'ytd-promoted-video-renderer',
    'ytd-statement-banner-renderer', 'ytd-video-masthead-ad-v3-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    'ytd-merch-shelf-renderer', 'ytd-action-companion-ad-renderer',
    'ytd-movie-offer-module-renderer', 'ytd-brand-video-singleton-renderer',
    'ytd-brand-video-shelf-renderer', '#player-ads', '#masthead-ad',
    '.ytp-ad-overlay-container', '.ytp-ad-progress', '.ytp-ad-progress-list',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    'div#player-ads.style-scope.ytd-watch-flexy',
    '[layout="compact-promoted-item"]',
    'ytd-reel-video-renderer[is-ad]', 'ytd-reel-video-renderer:has(ytd-ad-slot-renderer)',
    'ytmusic-mealbar-promo-renderer', 'ytmusic-statement-banner-renderer',
    'ytd-mealbar-promo-renderer', 'tp-yt-paper-dialog:has(#mealbar-promo-renderer)',
    'ytd-popup-container:has(a[href*="premium"])', 'ytd-enforcement-message-view-model',
  ].join(', ') + ' { display: none !important; }\\n' +
  // When ad is showing: hide video + overlays (both .ad-showing parent AND direct selectors)
  '.ad-showing video, .ad-interrupting video { opacity: 0 !important; }\\n' +
  '.ad-showing .html5-video-container, .ad-interrupting .html5-video-container { background: #0f0f0f !important; }\\n' +
  // Direct hiding of ad overlays regardless of parent class
  '.ytp-ad-player-overlay { opacity: 0 !important; pointer-events: none !important; }\\n' +
  '.ytp-ad-player-overlay-instream-info { opacity: 0 !important; }\\n' +
  '.ytp-ad-image-overlay { display: none !important; }\\n' +
  '.ytp-ad-text { display: none !important; }\\n' +
  '.ytp-ad-preview-container { display: none !important; }\\n' +
  '.ytp-ad-badge-container { display: none !important; }\\n' +
  '.ytp-ad-skip-button-slot { z-index: 999999 !important; opacity: 1 !important; }\\n' +
  // Hide the "Visit site" / "Sponsored" info overlay
  '.ytp-ad-action-interstitial { display: none !important; }\\n' +
  '.ytp-ad-visit-advertiser-button { display: none !important; }\\n';
  document.head.appendChild(style);

  // ── Aggressive ad skipper — multi-strategy approach ──
  let wasInAd = false;
  let contentMutedByUs = false;
  let contentVolume = 1;
  let adStartTime = 0;

  function tryClickSkip() {
    // Strategy 1: Direct CSS selectors for known skip buttons (2024-2026 YouTube UI)
    const selectors = [
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-skip-button-slot .ytp-ad-skip-button-container',
      'button.ytp-skip-ad-button',
      '.videoAdUiSkipButton',
      '[id^="skip-button"] button',
      'button[id^="skip-button"]',
      '.ytp-ad-skip-button-modern__label',
      // 2026 YouTube selectors
      '.ytp-ad-skip-button-modern button',
      'ytd-skip-button-renderer button',
      '.ytp-skip-ad-button__text',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn instanceof HTMLElement) { btn.click(); return true; }
    }

    // Strategy 2: Find ANY clickable element containing "Skip" in the player area
    const playerArea = document.querySelector('#movie_player, .html5-video-player');
    if (playerArea) {
      const allClickable = playerArea.querySelectorAll('button, [role="button"], a, span[tabindex], div[tabindex]');
      for (const el of allClickable) {
        const text = (el.textContent || '').trim().toLowerCase();
        if (text.includes('skip') && !text.includes('unskippable')) {
          (el as HTMLElement).click();
          return true;
        }
      }
    }

    // Strategy 3: Search the ENTIRE page for skip buttons (YouTube may render them outside #movie_player)
    const allBtns = document.querySelectorAll('button, [role="button"]');
    for (const btn of allBtns) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text === 'skip' || text === 'skip ad' || text === 'skip ads' ||
          text.startsWith('skip ') || text.includes('skip ad')) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    return false;
  }

  function handleAd() {
    try {
      const player = document.querySelector('#movie_player');
      const video = document.querySelector('video');
      if (!player || !video) return;

      const isAdShowing = player.classList.contains('ad-showing') ||
        player.classList.contains('ad-interrupting') ||
        !!document.querySelector('.ytp-ad-player-overlay') ||
        !!document.querySelector('.ytp-ad-player-overlay-instream-info') ||
        !!document.querySelector('.ytp-ad-action-interstitial') ||
        !!document.querySelector('[class*="ad-showing"]') ||
        !!document.querySelector('.ytp-ad-skip-button-slot:not(:empty)') ||
        !!document.querySelector('.video-ads .ad-container');

      if (isAdShowing) {
        if (!wasInAd) {
          // Ad just started — instantly mute and remember volume
          contentVolume = video.volume;
          video.volume = 0;
          video.muted = true;
          contentMutedByUs = true;
          adStartTime = Date.now();
        }
        wasInAd = true;

        // Always try skip — the button may appear after a countdown
        tryClickSkip();

        // Speed through unskippable ads
        if (video.playbackRate !== 16) video.playbackRate = 16;
        if (video.duration && isFinite(video.duration) && video.duration > 0.5) {
          video.currentTime = video.duration - 0.1;
        }

        // Force-close overlay/banner ads
        const overlayClose = document.querySelectorAll(
          '.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container button, [id^="dismiss-button"]'
        );
        overlayClose.forEach(el => { if (el instanceof HTMLElement) el.click(); });

        // Safety: if ad has been "playing" for more than 3 seconds despite our skip,
        // try more aggressive approach
        if (Date.now() - adStartTime > 3000) {
          // Try clicking anywhere in the skip button slot area
          const skipSlot = document.querySelector('.ytp-ad-skip-button-slot');
          if (skipSlot instanceof HTMLElement) skipSlot.click();
        }

      } else if (wasInAd) {
        // Ad ended — restore playback
        wasInAd = false;
        video.playbackRate = 1;
        if (contentMutedByUs) {
          video.muted = false;
          video.volume = contentVolume || 1;
          contentMutedByUs = false;
        }
        // Resume if stalled
        if (video.paused && !video.ended) video.play().catch(() => {});
        adStartTime = 0;
      }
    } catch {}
  }

  // Poll every 50ms for fastest possible response
  const adSkipper = setInterval(handleAd, 50);

  // MutationObserver for instant detection when ad-showing class is added
  const waitForPlayer = setInterval(() => {
    const mp = document.querySelector('#movie_player');
    if (mp) {
      clearInterval(waitForPlayer);
      new MutationObserver(() => handleAd()).observe(mp, {
        attributes: true,
        attributeFilter: ['class'],
      });
      // Also observe child additions for dynamically inserted ad elements
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.classList?.contains('ytp-ad-module') ||
                  node.classList?.contains('video-ads') ||
                  node.tagName === 'YTD-AD-SLOT-RENDERER') {
                handleAd();
                break;
              }
            }
          }
        }
      }).observe(mp, { childList: true, subtree: true });
    }
  }, 500);
  setTimeout(() => clearInterval(waitForPlayer), 30000);

  window.addEventListener('unload', () => { clearInterval(adSkipper); clearInterval(waitForPlayer); }, { once: true });
})();
`;

const YOUTUBE_SAFE_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserYTSafeAdBlock) return;
  window.__osBrowserYTSafeAdBlock = true;
  if (!window.__ozzyTimers) window.__ozzyTimers = [];

  let wasInAd = false;
  let contentMutedByUs = false;

  // ── Auto-skip ads with smooth content transition ──
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
        if (!wasInAd) {
          video.style.opacity = '0';
          video.style.pointerEvents = 'none';
          if (!document.getElementById('__ozzy-ad-mask')) {
            const mask = document.createElement('div');
            mask.id = '__ozzy-ad-mask';
            mask.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#0f0f0f;z-index:9998;pointer-events:none;';
            player?.appendChild(mask);
          }
        }
        wasInAd = true;

        // Click skip button if available
        const skipSelectors = [
          '.ytp-skip-ad-button', '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern',
          '[id^="skip-button"] button', '.ytp-ad-skip-button-slot button',
          'button.ytp-skip-ad-button', '.videoAdUiSkipButton',
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

        // If no skip button, mute and fast-forward
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
          '.ytp-ad-overlay-close-button', '.ytp-ad-overlay-close-container',
          '[id^="dismiss-button"]', '.ytp-ad-overlay-close-button button',
        ];
        for (const sel of closeSelectors) {
          const el = document.querySelector(sel);
          if (el instanceof HTMLElement) el.click();
        }
      } else if (wasInAd && video) {
        wasInAd = false;
        video.playbackRate = 1;
        if (contentMutedByUs) { video.muted = false; contentMutedByUs = false; }
        if (video.paused && !video.ended) video.play().catch(() => {});
        if (player && player.classList.contains('ad-interrupting')) {
          const skipAny = document.querySelector('[class*="skip"]');
          if (skipAny instanceof HTMLElement) skipAny.click();
        }
        setTimeout(() => {
          video.style.transition = 'opacity 200ms ease-in';
          video.style.opacity = '1';
          video.style.pointerEvents = '';
          const mask = document.getElementById('__ozzy-ad-mask');
          if (mask) { mask.style.transition = 'opacity 200ms ease-out'; mask.style.opacity = '0'; setTimeout(() => mask.remove(), 200); }
          setTimeout(() => { video.style.transition = ''; }, 250);
        }, 100);
      }

      // Close overlay ads outside ad state
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

  // ── MutationObserver for instant ad detection ──
  try {
    const playerObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
        const target = mutation.target;
        if (!(target instanceof HTMLElement) || target.id !== 'movie_player') continue;
        if (target.classList.contains('ad-showing')) {
          const video = document.querySelector('video');
          if (!video) return;
          video.style.opacity = '0';
          video.style.pointerEvents = 'none';
          if (!document.getElementById('__ozzy-ad-mask')) {
            const mask = document.createElement('div');
            mask.id = '__ozzy-ad-mask';
            mask.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#0f0f0f;z-index:9998;pointer-events:none;';
            target.appendChild(mask);
          }
          wasInAd = true;
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
      if (mp) { clearInterval(waitForPlayer); playerObserver.observe(mp, { attributes: true, attributeFilter: ['class'] }); }
    }, 500);
    window.__ozzyTimers.push(waitForPlayer);
    setTimeout(() => clearInterval(waitForPlayer), 30000);
  } catch {}

  // ── Block ad script loading ──
  try {
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function(tag, options) {
      const el = origCreateElement(tag, options);
      if (tag.toLowerCase() === 'script') {
        const origSetAttr = el.setAttribute.bind(el);
        el.setAttribute = function(name, value) {
          if (name === 'src' && typeof value === 'string') {
            const adDomains = ['googlesyndication.com', 'doubleclick.net', 'youtube.com/pagead/', 's0.2mdn.net', 'pagead2.googlesyndication.com'];
            if (adDomains.some(d => value.includes(d))) return;
          }
          return origSetAttr(name, value);
        };
      }
      return el;
    };
  } catch {}

  // ── Suppress anti-adblock detection ──
  try {
    Object.defineProperty(window, 'adBlocksFound', { configurable: true, get() { return 0; }, set() {} });
    Object.defineProperty(window, 'hasAdBlocker', { configurable: true, get() { return false; }, set() {} });
  } catch {}

  // ── CSS cosmetic hiding ──
  const style = document.createElement('style');
  style.textContent = [
    'ytd-ad-slot-renderer', 'ytd-banner-promo-renderer', 'ytd-companion-slot-renderer',
    'ytd-display-ad-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer', 'ytd-promoted-video-renderer',
    'ytd-statement-banner-renderer', 'ytd-video-masthead-ad-v3-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    'ytd-merch-shelf-renderer', 'ytd-action-companion-ad-renderer',
    'ytd-movie-offer-module-renderer', 'ytd-brand-video-singleton-renderer',
    'ytd-brand-video-shelf-renderer', '#player-ads', '#masthead-ad',
    '.ytp-ad-module', '.ytp-ad-overlay-container', '.ytp-ad-progress',
    '.ytp-ad-progress-list', '.ytp-ad-skip-button-slot',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    'div#player-ads.style-scope.ytd-watch-flexy',
    '[layout="compact-promoted-item"]',
    'ytd-reel-video-renderer[is-ad]', 'ytd-reel-video-renderer:has(ytd-ad-slot-renderer)',
    'ytmusic-mealbar-promo-renderer', 'ytmusic-statement-banner-renderer',
    'ytd-mealbar-promo-renderer', 'tp-yt-paper-dialog:has(#mealbar-promo-renderer)',
    'ytd-popup-container:has(a[href*="premium"])', 'ytd-enforcement-message-view-model',
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

  // Track last known content segment URL for M3U8 rewriting
  let lastContentSegmentUrl = '';

  // ── Intercept fetch for M3U8 playlists, GraphQL responses, and ad tracking ──
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    // Block Twitch ad tracking pixels
    try {
      if (url.includes('spade.twitch.tv')) {
        return new Response('', { status: 204 });
      }
    } catch {}

    // Strip ad segments from HLS playlists
    if (url.includes('.m3u8')) {
      const response = await originalFetch.apply(this, args);
      try {
        const text = await response.clone().text();
        if (text.includes('stitched-ad') || text.includes('twitch-ad') || text.includes('Amazon-Ads')) {
          // Remove ad segments — strip #EXT-X-DATERANGE ad tags and their segments
          // Replace ad segments with the last known content segment
          const lines = text.split('\\n');
          const cleaned = [];
          let skipSegment = false;
          let adSegmentCount = 0;
          // First pass: find last content segment URL (non-ad .ts URL)
          for (const line of lines) {
            if (line.trim().startsWith('http') && !line.includes('stitched-ad') && !line.includes('twitch-ad') && !line.includes('Amazon-Ads') && line.includes('.ts')) {
              lastContentSegmentUrl = line.trim();
            }
          }
          // Second pass: strip ads, replace with content segment
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('stitched-ad') || line.includes('twitch-ad') || line.includes('Amazon-Ads')) {
              skipSegment = true;
              continue;
            }
            if (skipSegment && line.startsWith('#EXTINF')) {
              // Replace ad EXTINF + segment URL with content segment
              if (lastContentSegmentUrl) {
                cleaned.push(line);
                // Skip the next line (ad segment URL) and replace with content
                if (i + 1 < lines.length && lines[i + 1].trim().startsWith('http')) {
                  cleaned.push(lastContentSegmentUrl);
                  i++;
                  adSegmentCount++;
                }
              }
              continue;
            }
            if (skipSegment && line.trim().startsWith('http')) {
              // This is an ad segment URL without preceding EXTINF we caught
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

    // Strip ad data from GraphQL responses
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

  // ── Ad state detection with smooth transition ──
  let twitchWasInAd = false;
  let twitchMutedByUs = false;

  const adWatcher = setInterval(() => {
    try {
      const adOverlay = document.querySelector('[data-a-target="video-ad-label"], .stream-display-ad__container, [data-test-selector="sad-overlay"]');
      const video = document.querySelector('video');

      if (adOverlay && video) {
        twitchWasInAd = true;
        // Mute the ad audio so user doesn't hear it
        if (!video.muted) {
          video.muted = true;
          twitchMutedByUs = true;
        }
        // Try to skip past the ad segment
        if (video.duration && isFinite(video.duration) && video.duration > 1) {
          video.currentTime = video.duration - 0.1;
        }
        video.playbackRate = 16;
      } else if (twitchWasInAd && video) {
        // Ad ended — restore smooth playback
        twitchWasInAd = false;
        video.playbackRate = 1;
        if (twitchMutedByUs) {
          video.muted = false;
          twitchMutedByUs = false;
        }
        // Ensure stream resumes playing
        if (video.paused) {
          video.play().catch(() => {});
        }
      }

      // Click close buttons on ad banners
      const closeBtn = document.querySelector('[data-a-target="video-ad-close-button"], .tw-absolute button[aria-label="Close"]');
      if (closeBtn instanceof HTMLElement) closeBtn.click();
    } catch {}
  }, 200);

  // ── CSS cosmetic hiding ──
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

  // ── CSS cosmetic hiding ──
  const style = document.createElement('style');
  style.textContent = [
    '[data-ad-rendering-role]',
    '[data-ad-preview]',
    '[aria-label="Sponsored"]',
    'div[data-pagelet*="FeedUnit"]:has([aria-label="Sponsored"])',
    'div[data-pagelet*="FeedUnit"]:has(a[href*="/ads/"])',
    'div[role="article"]:has([aria-label="Sponsored"])',
    // Instagram
    'article:has([class*="Sponsored"])',
    '[class*="SponsoredLabel"]',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  // ── MutationObserver for dynamically loaded sponsored content ──
  const sponsoredTexts = ['Sponsored', 'Gesponsert', 'Sponsoris\\u00e9', 'Patrocinado', 'Bersponsor', '\\u5e7f\\u544a', '\\u30b9\\u30dd\\u30f3\\u30b5\\u30fc'];

  function isSponsoredPost(node) {
    if (!(node instanceof HTMLElement)) return false;
    // Check for data attributes Facebook uses
    if (node.querySelector('[data-ad-rendering-role], [data-ad-preview], [aria-label="Sponsored"]')) return true;
    // Check for "Sponsored" text in link spans
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
        // Check if it's a feed post container
        const articles = node.matches('[role="article"]') ? [node] : Array.from(node.querySelectorAll('[role="article"]'));
        for (const article of articles) {
          if (isSponsoredPost(article)) {
            article.style.display = 'none';
            // Pause any video inside
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

  // ── CSS cosmetic hiding ──
  const style = document.createElement('style');
  style.textContent = [
    'article:has([data-testid="promotedIndicator"])',
    'div[data-testid="placementTracking"]',
    '[data-testid="tweet"]:has([data-testid="promotedIndicator"])',
    'aside[role="complementary"]:has([data-testid="promotedIndicator"])',
    // Promoted trend items
    '[data-testid="trend"]:has([data-testid="promotedIndicator"])',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  // ── Intercept GraphQL API to strip promoted content ──
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

  // ── MutationObserver for dynamic promoted tweet injection ──
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
// TIKTOK AD BLOCKER
// ══════════════════════════════════════════════════════════════════════════════
const TIKTOK_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserTikTokAdBlock) return;
  window.__osBrowserTikTokAdBlock = true;

  // ── CSS cosmetic hiding ──
  const style = document.createElement('style');
  style.textContent = [
    '[class*="DivAdBadge"]',
    '[class*="SpanAdBadge"]',
    'div[data-e2e="recommend-list-item-container"]:has([class*="SpanAdBadge"])',
    'div[data-e2e="recommend-list-item-container"]:has([class*="DivAdBadge"])',
    '[class*="DivBrowserModeContainer"]:has([class*="ad-badge"])',
    '[class*="TopViewEntry"]',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  // ── Intercept API to filter ad items ──
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('/api/recommend/item_list') || url.includes('/api/post/item_list')) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        if (json.itemList && Array.isArray(json.itemList)) {
          json.itemList = json.itemList.filter(item => !item.isAd && !item.is_ad);
        }
        return new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch { return response; }
    }
    return originalFetch.apply(this, args);
  };

  // ── MutationObserver for dynamic ad injection ──
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const adBadge = node.querySelector('[class*="AdBadge"], [class*="ad-badge"]');
        if (adBadge) {
          const container = node.closest('[data-e2e="recommend-list-item-container"]') || node;
          container.style.display = 'none';
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

  // ── Block VAST ad requests — return empty VAST XML ──
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

  // ── Override player config ──
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

  // ── CSS cosmetic hiding ──
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

// ══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL VIDEO AD BLOCKER — runs on ALL non-whitelisted sites
// Handles Google IMA SDK, VAST/VPAID, ad overlays, anti-adblock bypass
// ══════════════════════════════════════════════════════════════════════════════
const UNIVERSAL_VIDEO_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserUniversalAdBlock) return;
  window.__osBrowserUniversalAdBlock = true;

  const EMPTY_VAST = '<VAST version="3.0"/>';
  const AD_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'imasdk.googleapis.com', 'pagead2.googlesyndication.com', 's0.2mdn.net',
    'securepubads.g.doubleclick.net', 'googleads.g.doubleclick.net',
    'pubads.g.doubleclick.net', 'adservice.google.com',
    'moatads.com', 'adsrvr.org', 'serving-sys.com',
  ];

  function isAdUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return AD_DOMAINS.some(d => lower.includes(d)) ||
           lower.includes('/vast') || lower.includes('/vpaid') ||
           lower.includes('/pagead/') || lower.includes('/adunit');
  }

  // ── 1. Google IMA SDK Neutralization ──
  // Intercept the google.ima namespace and replace with stubs
  // that immediately report "no ads available"
  try {
    const imaStub = {
      AdDisplayContainer: class { initialize() {} destroy() {} },
      AdError: class { getErrorCode() { return 0; } getMessage() { return ''; } getType() { return ''; } },
      AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
      AdEvent: { Type: {
        ALL_ADS_COMPLETED: 'allAdsCompleted', COMPLETE: 'complete',
        CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
        CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
        LOADED: 'loaded', STARTED: 'started', CLICK: 'click',
        IMPRESSION: 'impression', SKIPPED: 'skipped',
      }},
      AdsLoader: class {
        constructor() { this._listeners = {}; }
        addEventListener(evt, cb) { this._listeners[evt] = cb; }
        removeEventListener() {}
        requestAds() {
          // Immediately fire ADS_MANAGER_LOADED with a no-op manager
          setTimeout(() => {
            const cb = this._listeners['adsManagerLoaded'];
            if (cb) cb({ getAdsManager: () => new imaStub.AdsManager() });
          }, 10);
        }
        contentComplete() {}
        destroy() {}
      },
      AdsManager: class {
        constructor() { this._listeners = {}; }
        addEventListener(evt, cb) { this._listeners[evt] = cb; }
        removeEventListener() {}
        init() {}
        start() {
          // Immediately fire ALL_ADS_COMPLETED so the player starts content
          setTimeout(() => {
            const cb = this._listeners['allAdsCompleted'] || this._listeners['contentResumeRequested'];
            if (cb) cb({ type: 'allAdsCompleted' });
          }, 10);
        }
        stop() {}
        destroy() {}
        resize() {}
        getRemainingTime() { return 0; }
        getVolume() { return 1; }
        setVolume() {}
        isCustomPlaybackUsed() { return false; }
        isCustomClickTrackingUsed() { return false; }
      },
      AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
      AdsRenderingSettings: class {},
      AdsRequest: class {},
      CompanionAdSelectionSettings: class {},
      ImaSdkSettings: class {
        setLocale() {} setVpaidMode() {} setAutoPlayAdBreaks() {}
        setNumRedirects() {} setSessionId() {} setPlayerVersion() {}
        setPlayerType() {} getCompanionBackfill() { return ''; }
      },
      OmidAccessMode: { FULL: 'full', DOMAIN: 'domain', LIMITED: 'limited' },
      OmidVerificationVendor: {},
      UiElements: { COUNTDOWN: 'countdown', AD_ATTRIBUTION: 'adAttribution' },
      ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' },
      settings: new (class { setLocale() {} setVpaidMode() {} setAutoPlayAdBreaks() {} setNumRedirects() {} })(),
    };

    // Use a Proxy to intercept google.ima assignment at any depth
    let _google = window.google;
    Object.defineProperty(window, 'google', {
      configurable: true,
      get() { return _google; },
      set(val) {
        _google = val;
        if (val && typeof val === 'object') {
          val.ima = imaStub;
        }
      },
    });
    // If google already exists, patch it now
    if (window.google) window.google.ima = imaStub;
  } catch {}

  // ── 2. VAST/VPAID Request Interception ──
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (isAdUrl(url)) {
      return new Response(EMPTY_VAST, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
    return originalFetch.apply(this, args);
  };

  const origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__universalAdBlocked = typeof url === 'string' && isAdUrl(url);
    return origXhrOpen.call(this, method, url, ...rest);
  };
  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this.__universalAdBlocked) {
      Object.defineProperty(this, 'responseText', { value: EMPTY_VAST, writable: false });
      Object.defineProperty(this, 'responseXML', { value: new DOMParser().parseFromString(EMPTY_VAST, 'text/xml'), writable: false });
      Object.defineProperty(this, 'status', { value: 200, writable: false });
      Object.defineProperty(this, 'readyState', { value: 4, writable: false });
      setTimeout(() => {
        this.dispatchEvent(new Event('readystatechange'));
        this.dispatchEvent(new Event('load'));
        this.dispatchEvent(new Event('loadend'));
      }, 0);
      return;
    }
    return origXhrSend.apply(this, args);
  };

  // ── 3. Block ad script loading ──
  try {
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag, options) {
      const el = origCreate(tag, options);
      if (tag.toLowerCase() === 'script') {
        const origSetSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        if (origSetSrc?.set) {
          Object.defineProperty(el, 'src', {
            set(val) {
              if (typeof val === 'string' && isAdUrl(val)) return;
              origSetSrc.set.call(this, val);
            },
            get() { return origSetSrc.get?.call(this) || ''; },
            configurable: true,
          });
        }
      }
      return el;
    };
  } catch {}

  // ── 4. Video overlay removal ──
  const AD_CLASSES = /\\b(ad[-_]?overlay|preroll|midroll|postroll|video[-_]?ad|ad[-_]?container|ad[-_]?wrapper|commercial[-_]?break|sponsor[-_]?overlay)\\b/i;

  function removeAdOverlays() {
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) continue;
      // Find siblings and overlapping elements
      const parent = video.parentElement;
      if (!parent) continue;
      const overlays = parent.querySelectorAll('div, span, aside');
      for (const el of overlays) {
        if (el.contains(video)) continue;
        const cls = (el.className || '') + ' ' + (el.id || '');
        if (AD_CLASSES.test(cls)) {
          el.style.display = 'none';
        }
      }
    }
  }

  // ── 4b. Fake dialog / scam popup removal ──
  // Streaming sites show fake "install Opera/Chrome" dialogs, fake virus warnings,
  // fake captchas, etc. as DOM elements styled to look like native OS dialogs.
  function removeFakeDialogs() {
    try {
      const allEls = document.querySelectorAll('div, section, aside, dialog');
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        // Must be a fixed/absolute overlay
        if (style.position !== 'fixed' && style.position !== 'absolute') continue;
        if (parseInt(style.zIndex || '0') < 100) continue;
        // Check text content for scam patterns
        const text = el.textContent || '';
        const lowerText = text.toLowerCase();
        const isFakeDialog = (
          // Fake browser install prompts
          (/install|download|update|upgrade/i.test(lowerText) && /opera|chrome|firefox|browser|extension|addon|plugin/i.test(lowerText) && /recommended|required|necessary|continue/i.test(lowerText)) ||
          // Fake virus/malware warnings
          (/virus|malware|infected|trojan|spyware|threat|compromised/i.test(lowerText) && /scan|clean|remove|protect|detected/i.test(lowerText)) ||
          // Fake captcha / verification
          (/robot|human|verify|captcha/i.test(lowerText) && /allow|click|press|notification/i.test(lowerText) && el.querySelector('button')) ||
          // "You've won" scams
          (/congratulation|winner|won|prize|reward/i.test(lowerText) && /claim|click|collect/i.test(lowerText))
        );
        if (isFakeDialog) {
          el.style.display = 'none';
          el.remove();
          // Also remove any backdrop/overlay behind it
          const siblings = el.parentElement?.children;
          if (siblings) {
            for (const sib of siblings) {
              if (sib instanceof HTMLElement && sib !== el) {
                const sibStyle = getComputedStyle(sib);
                if ((sibStyle.position === 'fixed' || sibStyle.position === 'absolute') &&
                    parseFloat(sibStyle.opacity) < 0.8 &&
                    sib.offsetWidth > window.innerWidth * 0.9 &&
                    sib.offsetHeight > window.innerHeight * 0.9) {
                  sib.style.display = 'none';
                }
              }
            }
          }
        }
      }
    } catch {}
  }

  // Run overlay + fake dialog removal periodically and on DOM changes
  const overlayInterval = setInterval(() => { removeAdOverlays(); removeFakeDialogs(); }, 2000);
  const overlayObserver = new MutationObserver(() => {
    requestIdleCallback ? requestIdleCallback(() => { removeAdOverlays(); removeFakeDialogs(); }) : setTimeout(() => { removeAdOverlays(); removeFakeDialogs(); }, 100);
  });
  overlayObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });

  // ── 5. Block popup/popunder and redirect hijacking ──
  // Streaming sites use click events to trigger window.open() or location changes
  try {
    const POPUP_AD_DOMAINS = [
      'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
      'moatads.com', 'adsrvr.org', 'serving-sys.com', 'adnxs.com',
      'taboola.com', 'outbrain.com', 'revcontent.com', 'mgid.com',
      'popads.net', 'popcash.net', 'propellerads.com', 'hilltopads.net',
      'exoclick.com', 'juicyads.com', 'trafficjunky.com', 'adcash.com',
      'clickadu.com', 'richpush.com', 'onclicka.com', 'onclickmax.com',
      'clickaine.com', 'adf.ly', 'bc.vc', 'sh.st', 'shorte.st',
      'betaheat.com', 'revenuenetworkcpm.com',
    ];
    function isPopupAdUrl(url) {
      try {
        const h = new URL(url).hostname.toLowerCase();
        return POPUP_AD_DOMAINS.some(d => h === d || h.endsWith('.' + d));
      } catch { return false; }
    }

    // Block window.open to ad domains
    const origOpen = window.open;
    window.open = function(url, ...rest) {
      if (url && typeof url === 'string' && isPopupAdUrl(url)) return null;
      return origOpen.call(this, url, ...rest);
    };

    // Detect and block click-hijack redirects
    // Many streaming sites add invisible overlays that trigger location.href changes
    let userClickedContent = false;
    document.addEventListener('mousedown', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      // Mark as genuine content click if user clicked on video, player, or main content
      const isContent = target.closest('video, [class*="player"], main, article, .content, [role="main"]');
      userClickedContent = !!isContent;
      // Auto-clear after 500ms
      setTimeout(() => { userClickedContent = false; }, 500);
    }, true);

    // Block invisible overlay click hijackers
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      // Detect invisible overlays — full-screen transparent divs used as ad click traps
      const style = getComputedStyle(target);
      const isTransparent = parseFloat(style.opacity) < 0.05 || style.backgroundColor === 'transparent' || style.background === 'transparent';
      const isFullCover = target.offsetWidth > window.innerWidth * 0.8 && target.offsetHeight > window.innerHeight * 0.5;
      if (isTransparent && isFullCover && !target.closest('video')) {
        e.preventDefault();
        e.stopPropagation();
        target.style.pointerEvents = 'none';
        target.style.display = 'none';
      }
    }, true);
  } catch {}

  // ── 6. Comprehensive anti-adblock bypass ──
  const bypassProps = {
    adBlocksFound: 0, hasAdBlocker: false, adBlockDetected: false,
    adblockEnabled: false, isAdBlockActive: false, adBlockerDetected: false,
    canRunAds: true, google_ad_status: 1,
  };
  for (const [prop, val] of Object.entries(bypassProps)) {
    try {
      Object.defineProperty(window, prop, {
        configurable: true,
        get() { return val; },
        set() {},
      });
    } catch {}
  }

  // Stub blockAdBlock / fuckAdBlock / OnAdBlock libraries
  const adBlockStub = {
    onDetected: function() { return this; },
    onNotDetected: function() { return this; },
    on: function() { return this; },
    check: function() { return this; },
    emitEvent: function() { return this; },
    setOption: function() { return this; },
  };
  try {
    window.blockAdBlock = adBlockStub;
    window.fuckAdBlock = adBlockStub;
    window.sniffAdBlock = adBlockStub;
    window.OnAdBlock = adBlockStub;
  } catch {}

  // Additional window property overrides for anti-adblock
  const extraBypassProps = {
    __adblocker: false,
    isAdBlockActive: false,
    adBlockerEnabled: false,
    canShowAds: true,
  };
  for (const [prop, val] of Object.entries(extraBypassProps)) {
    try {
      Object.defineProperty(window, prop, {
        configurable: true,
        get() { return val; },
        set() {},
      });
    } catch {}
  }

  // ── Override document.getElementById to protect ad bait checks ──
  try {
    const origGetById = document.getElementById.bind(document);
    document.getElementById = function(id) {
      const el = origGetById(id);
      if (!el && /\\b(ad[s_-]?box|ad[s_-]?banner|ad[s_-]?placement|ad[s_-]?container|advert|adsense)\\b/i.test(id)) {
        // Return a fake element with offsetHeight/offsetWidth so bait checks pass
        const fake = document.createElement('div');
        Object.defineProperty(fake, 'offsetHeight', { get() { return 1; } });
        Object.defineProperty(fake, 'offsetWidth', { get() { return 1; } });
        Object.defineProperty(fake, 'clientHeight', { get() { return 1; } });
        Object.defineProperty(fake, 'clientWidth', { get() { return 1; } });
        return fake;
      }
      return el;
    };
  } catch {}

  // ── Intercept eval() calls with adblock detection patterns ──
  try {
    const origEval = window.eval;
    window.eval = function(code) {
      if (typeof code === 'string') {
        const adDetectPatterns = /adblock|ad-block|adsbox|ad_block|blockadblock|fuckadblock|detectAdBlock|adBlockDetected/i;
        if (adDetectPatterns.test(code)) {
          // Neutralize the detection code by returning undefined
          return undefined;
        }
      }
      return origEval.call(this, code);
    };
  } catch {}

  // Protect bait elements — adblockers are detected by checking if
  // elements with class 'adsbox' or 'ad-placement' get hidden
  const baitObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const cls = node.className || '';
        if (/\\b(adsbox|ad-placement|ad-banner|textads|banner-ad)\\b/i.test(cls)) {
          // Ensure the bait element stays visible
          node.style.setProperty('display', 'block', 'important');
          node.style.setProperty('height', '1px', 'important');
          node.style.setProperty('width', '1px', 'important');
          node.style.setProperty('visibility', 'visible', 'important');
          node.style.setProperty('opacity', '1', 'important');
          node.style.setProperty('position', 'absolute', 'important');
          node.style.setProperty('left', '-9999px', 'important');
        }
      }
    }
  });
  baitObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });

  // ── 7. Vimeo pre-roll ad blocking ──
  try {
    const vimeoFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      // Block Vimeo ad endpoints
      if (/\\.vimeocdn\\.com\\/p\\//i.test(url) || /vimeo\\.com.*\\/ads/i.test(url)) {
        return new Response('', { status: 200 });
      }
      return vimeoFetch.apply(this, args);
    };
  } catch {}

  // ── 8. Generic HLS ad segment removal ──
  // For any M3U8 playlist, strip EXT-X-DATERANGE tags with ad-related content
  try {
    const hlsFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await hlsFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (url.includes('.m3u8')) {
        try {
          const text = await response.clone().text();
          if (/EXT-X-DATERANGE.*?(ad|preroll|midroll|postroll)/i.test(text)) {
            const lines = text.split('\\n');
            const cleaned = [];
            let skipNext = false;
            for (const line of lines) {
              // Skip EXT-X-DATERANGE lines with ad markers
              if (line.includes('EXT-X-DATERANGE') && /(ad|preroll|midroll|postroll)/i.test(line)) {
                skipNext = true;
                continue;
              }
              // Skip the segment URL following an ad DATERANGE
              if (skipNext && (line.startsWith('#EXTINF') || line.trim().startsWith('http'))) {
                if (line.trim().startsWith('http')) skipNext = false;
                continue;
              }
              if (skipNext && !line.startsWith('#')) {
                skipNext = false;
                continue;
              }
              cleaned.push(line);
            }
            return new Response(cleaned.join('\\n'), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }
        } catch {}
      }
      return response;
    };
  } catch {}

  // ── 9. JW Player ad neutralization ──
  try {
    const origJwSetup = Object.getOwnPropertyDescriptor(window, 'jwplayer');
    const jwHandler = {
      apply(target, thisArg, args) {
        const instance = Reflect.apply(target, thisArg, args);
        if (instance && typeof instance === 'object') {
          // Strip advertising config from setup
          const origSetup = instance.setup;
          if (typeof origSetup === 'function') {
            instance.setup = function(config) {
              if (config && typeof config === 'object') {
                delete config.advertising;
                delete config.ad;
                delete config.ads;
                delete config.vastUrl;
                delete config.preroll;
              }
              return origSetup.call(this, config);
            };
          }
          // Override setPlaylistItem to strip ad config
          const origSetPlaylist = instance.setPlaylistItem;
          if (typeof origSetPlaylist === 'function') {
            instance.setPlaylistItem = function(item) {
              if (item && typeof item === 'object') {
                delete item.advertising;
                delete item.adschedule;
              }
              return origSetPlaylist.call(this, item);
            };
          }
        }
        return instance;
      }
    };
    if (typeof window.jwplayer === 'function') {
      window.jwplayer = new Proxy(window.jwplayer, jwHandler);
    }
    // Also watch for late jwplayer assignment
    let _jwplayer = window.jwplayer;
    Object.defineProperty(window, 'jwplayer', {
      configurable: true,
      get() { return _jwplayer; },
      set(val) {
        if (typeof val === 'function') {
          _jwplayer = new Proxy(val, jwHandler);
        } else {
          _jwplayer = val;
        }
      },
    });
    // Stub jwplayer.plugins.vast
    try {
      if (window.jwplayer && window.jwplayer.plugins) {
        window.jwplayer.plugins.vast = { ad: function(){} };
      }
    } catch {}
  } catch {}

  window.addEventListener('unload', () => {
    clearInterval(overlayInterval);
    overlayObserver.disconnect();
    baitObserver.disconnect();
  }, { once: true });
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// COOKIE CONSENT / GDPR AUTO-DISMISS — runs on ALL non-whitelisted sites
// Auto-clicks reject/accept buttons and hides cookie banners
// ══════════════════════════════════════════════════════════════════════════════
const COOKIE_CONSENT_BLOCK_SCRIPT = `
(function() {
  'use strict';
  try {
    if (window.__osBrowserCookieConsent) return;
    window.__osBrowserCookieConsent = true;

    var REJECT_SELECTORS = [
      'button[id*="reject" i]', 'button[class*="reject" i]',
      'button[data-action="reject"]', 'button[aria-label*="reject" i]',
      '[class*="cookie"] button[class*="reject" i]',
      '[class*="cookie"] button[class*="decline" i]',
      '[class*="cookie"] button[class*="deny" i]',
      'button[id*="necessary" i]', 'button[class*="necessary" i]',
      '#CybotCookiebotDialogBodyButtonDecline',
      '.cc-deny', '.cc-btn.cc-deny',
      'button[data-action="deny"]',
      'button[aria-label*="necessary only" i]',
      'button[aria-label*="reject all" i]',
    ];

    var ACCEPT_SELECTORS = [
      '#onetrust-accept-btn-handler',
      '.cc-dismiss', '.cc-btn.cc-allow',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '.js-cookie-consent-agree',
      '#accept-cookies',
      '.gdpr-consent-button',
      'button[data-action="accept"]',
      '[class*="cookie"] button[class*="accept" i]',
      '[class*="cookie"] button[class*="agree" i]',
      '[class*="cookie"] button[class*="allow" i]',
      '[id*="cookie"] button',
      '[data-cookiebanner] button',
      '[aria-label*="cookie" i] button',
      '[aria-label*="consent" i] button',
      '.cookie-notice__button',
    ];

    var CLOSE_SELECTORS = [
      '[class*="cookie"] [class*="close" i]',
      '[id*="cookie"] [class*="close" i]',
      '[class*="cookie"] button[aria-label*="close" i]',
      '[class*="consent"] [class*="close" i]',
    ];

    var BANNER_SELECTORS = [
      '.cookie-banner', '.cookie-consent', '.cc-banner', '#cookie-notice',
      '#cookie-law-info-bar', '.gdpr-banner', '#onetrust-banner-sdk',
      '#CybotCookiebotDialog', '.evidon-banner', '#truste-consent-track',
      '.cookie-disclaimer', '[class*="cookie-banner"]', '[class*="cookie-consent"]',
      '[class*="cookie-notice"]', '[id*="cookie-banner"]', '[id*="cookie-consent"]',
      '[class*="gdpr-consent"]', '[class*="cookie-popup"]', '[id*="cookie-popup"]',
      '[class*="consent-banner"]', '[id*="consent-banner"]',
    ];

    function clickFirst(selectors) {
      for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i]);
        if (el instanceof HTMLElement && el.offsetParent !== null) {
          el.click();
          return true;
        }
      }
      return false;
    }

    function dismissCookieBanner() {
      if (clickFirst(REJECT_SELECTORS)) return;
      if (clickFirst(ACCEPT_SELECTORS)) return;
      if (clickFirst(CLOSE_SELECTORS)) return;
      BANNER_SELECTORS.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          if (el instanceof HTMLElement) {
            el.style.setProperty('display', 'none', 'important');
          }
        });
      });
    }

    setTimeout(dismissCookieBanner, 1000);
    setTimeout(dismissCookieBanner, 3000);

    var cookieObserver = new MutationObserver(function(mutations) {
      var shouldCheck = false;
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) { shouldCheck = true; break; }
      }
      if (shouldCheck) setTimeout(dismissCookieBanner, 500);
    });
    cookieObserver.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('unload', function() { cookieObserver.disconnect(); }, { once: true });
  } catch(e) {}
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// FINGERPRINTING PROTECTION — canvas, WebGL, audio, screen fingerprint defense
// ══════════════════════════════════════════════════════════════════════════════
const FINGERPRINT_PROTECTION_SCRIPT = `
(function() {
  'use strict';
  try {
    if (window.__osBrowserFingerprintProtection) return;
    window.__osBrowserFingerprintProtection = true;

    var seed = sessionStorage.getItem('__ozzyFpSeed');
    if (!seed) {
      seed = String(Math.random() * 999999999 >>> 0);
      try { sessionStorage.setItem('__ozzyFpSeed', seed); } catch(e) {}
    }
    var seedNum = parseInt(seed, 10);

    function seededRandom(s) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return (s % 256) / 256;
    }

    // Canvas fingerprinting protection
    try {
      var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        try {
          var ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            var w = Math.min(this.width, 16);
            var h = Math.min(this.height, 16);
            var imageData = ctx.getImageData(0, 0, w, h);
            var data = imageData.data;
            for (var i = 0; i < data.length; i += 4) {
              data[i] = data[i] ^ (seededRandom(seedNum + i) > 0.5 ? 1 : 0);
            }
            ctx.putImageData(imageData, 0, 0);
          }
        } catch(e) {}
        return origToDataURL.apply(this, arguments);
      };

      var origToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(callback) {
        try {
          var ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            var w = Math.min(this.width, 16);
            var h = Math.min(this.height, 16);
            var imageData = ctx.getImageData(0, 0, w, h);
            var data = imageData.data;
            for (var i = 0; i < data.length; i += 4) {
              data[i] = data[i] ^ (seededRandom(seedNum + i) > 0.5 ? 1 : 0);
            }
            ctx.putImageData(imageData, 0, 0);
          }
        } catch(e) {}
        return origToBlob.apply(this, arguments);
      };
    } catch(e) {}

    // WebGL fingerprinting protection
    try {
      var getParamProto = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 0x9245) return 'Generic GPU Vendor';
        if (param === 0x9246) return 'Generic GPU Renderer';
        return getParamProto.call(this, param);
      };
      if (typeof WebGL2RenderingContext !== 'undefined') {
        var getParam2Proto = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(param) {
          if (param === 0x9245) return 'Generic GPU Vendor';
          if (param === 0x9246) return 'Generic GPU Renderer';
          return getParam2Proto.call(this, param);
        };
      }
    } catch(e) {}

    // AudioContext fingerprinting protection
    try {
      var origCreateOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        var osc = origCreateOscillator.apply(this, arguments);
        try {
          var origConnect = osc.connect.bind(osc);
          osc.connect = function(dest) {
            if (dest instanceof AnalyserNode) {
              try {
                var gain = osc.context.createGain();
                gain.gain.value = 1 + (seededRandom(seedNum + 42) * 0.0001 - 0.00005);
                origConnect(gain);
                gain.connect(dest);
                return dest;
              } catch(e) {}
            }
            return origConnect(dest);
          };
        } catch(e) {}
        return osc;
      };
    } catch(e) {}

    // Screen dimension masking
    try {
      var commonRes = [[1920,1080],[1366,768],[1536,864],[1440,900],[1280,720],[1600,900],[2560,1440]];
      var picked = commonRes[seedNum % commonRes.length];
      Object.defineProperty(screen, 'width', { get: function() { return picked[0]; }, configurable: true });
      Object.defineProperty(screen, 'height', { get: function() { return picked[1]; }, configurable: true });
      Object.defineProperty(screen, 'availWidth', { get: function() { return picked[0]; }, configurable: true });
      Object.defineProperty(screen, 'availHeight', { get: function() { return picked[1] - 40; }, configurable: true });
      Object.defineProperty(screen, 'colorDepth', { get: function() { return 24; }, configurable: true });
      Object.defineProperty(screen, 'pixelDepth', { get: function() { return 24; }, configurable: true });
    } catch(e) {}

    // Plugin/MimeType hiding
    try {
      Object.defineProperty(navigator, 'plugins', { get: function() { return []; }, configurable: true });
      Object.defineProperty(navigator, 'mimeTypes', { get: function() { return []; }, configurable: true });
    } catch(e) {}
  } catch(e) {}
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// NEWSLETTER POPUP BLOCKING — detects and auto-closes subscription popups
// ══════════════════════════════════════════════════════════════════════════════
const NEWSLETTER_POPUP_BLOCK_SCRIPT = `
(function() {
  'use strict';
  try {
    if (window.__osBrowserNewsletterBlock) return;
    window.__osBrowserNewsletterBlock = true;
    if (!window.__ozzyTimers) window.__ozzyTimers = [];

    var NEWSLETTER_KEYWORDS = /\\b(subscribe|newsletter|sign\\s*up\\s*for|get\\s*updates|join\\s*our|don.t\\s*miss|stay\\s*in\\s*touch|mailing\\s*list|email\\s*list|weekly\\s*digest)\\b/i;

    function isNewsletterPopup(el) {
      if (!(el instanceof HTMLElement)) return false;
      var style = getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'absolute') return false;
      var hasEmail = el.querySelector('input[type="email"], input[name*="email" i], input[placeholder*="email" i]');
      if (!hasEmail) return false;
      var text = (el.textContent || '').substring(0, 5000);
      return NEWSLETTER_KEYWORDS.test(text);
    }

    function isMainSignupPage() {
      return document.querySelectorAll('input[type="email"]').length > 2;
    }

    function dismissNewsletterPopups() {
      if (isMainSignupPage()) return;
      document.querySelectorAll('div, section, aside').forEach(function(el) {
        if (!(el instanceof HTMLElement)) return;
        if (!isNewsletterPopup(el)) return;

        var closeBtn = el.querySelector(
          'button[class*="close" i], button[aria-label*="close" i], ' +
          '[class*="close" i]:not(div), [class*="dismiss" i], .modal-close, [data-dismiss]'
        );
        if (closeBtn instanceof HTMLElement) { closeBtn.click(); return; }

        var buttons = el.querySelectorAll('button, [role="button"], a');
        for (var i = 0; i < buttons.length; i++) {
          var btnText = (buttons[i].textContent || '').trim().toLowerCase();
          if (btnText === 'x' || btnText === '\\u00d7' || btnText === 'close' ||
              btnText === 'dismiss' || btnText === 'no thanks' || btnText === 'no, thanks') {
            buttons[i].click(); return;
          }
        }
        el.style.setProperty('display', 'none', 'important');
      });
    }

    var newsletterInterval = setInterval(dismissNewsletterPopups, 3000);
    window.__ozzyTimers.push(newsletterInterval);
    setTimeout(dismissNewsletterPopups, 2000);

    var newsletterObserver = new MutationObserver(function(mutations) {
      var hasNew = false;
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) { hasNew = true; break; }
      }
      if (hasNew) setTimeout(dismissNewsletterPopups, 500);
    });
    newsletterObserver.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('unload', function() {
      clearInterval(newsletterInterval);
      newsletterObserver.disconnect();
      (window.__ozzyTimers || []).forEach(clearInterval);
    }, { once: true });
  } catch(e) {}
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// CRYPTO MINER BLOCKING — blocks known miner domains + script/WASM detection
// ══════════════════════════════════════════════════════════════════════════════
const CRYPTO_MINER_BLOCK_SCRIPT = `
(function() {
  'use strict';
  try {
    if (window.__osBrowserCryptoMinerBlock) return;
    window.__osBrowserCryptoMinerBlock = true;

    var MINER_DOMAINS = [
      'coinhive.com','coin-hive.com','crypto-loot.com','cryptaloot.pro',
      'monerominer.rocks','webminepool.com','ppoi.org','projectpoi.com',
      'authedmine.com','coinimp.com','minero.cc','webmine.cz',
      'jsecoin.com','mineralt.io','webminerpool.com',
    ];
    var MINER_PATHS = ['/lib/cryptonight','/miner','coinhive.min.js','cryptoloot.pro','cryptonight.wasm','deepminer.js'];

    function isMinerUrl(url) {
      if (!url || typeof url !== 'string') return false;
      var lower = url.toLowerCase();
      for (var i = 0; i < MINER_DOMAINS.length; i++) { if (lower.includes(MINER_DOMAINS[i])) return true; }
      for (var j = 0; j < MINER_PATHS.length; j++) { if (lower.includes(MINER_PATHS[j])) return true; }
      return false;
    }

    // Block miner script loading
    var origCreateElement = document.createElement.bind(document);
    document.createElement = function(tag, options) {
      var el = origCreateElement(tag, options);
      if (tag.toLowerCase() === 'script') {
        var origSetSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        if (origSetSrc && origSetSrc.set) {
          Object.defineProperty(el, 'src', {
            set: function(val) {
              if (typeof val === 'string' && isMinerUrl(val)) return;
              origSetSrc.set.call(this, val);
            },
            get: function() { return origSetSrc.get ? origSetSrc.get.call(this) : ''; },
            configurable: true,
          });
        }
      }
      return el;
    };

    // Block miner fetch requests
    var origFetch = window.fetch;
    window.fetch = function(input) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (isMinerUrl(url)) return Promise.resolve(new Response('', { status: 403, statusText: 'Blocked by OS Browser' }));
      return origFetch.apply(this, arguments);
    };

    // Block WebAssembly from miner domains
    var origWasmInstantiate = WebAssembly.instantiate;
    WebAssembly.instantiate = function(bufferSource, importObject) {
      try {
        var stack = new Error().stack || '';
        for (var i = 0; i < MINER_DOMAINS.length; i++) {
          if (stack.includes(MINER_DOMAINS[i])) return Promise.reject(new Error('Blocked by OS Browser'));
        }
      } catch(e) {}
      return origWasmInstantiate.apply(this, arguments);
    };

    if (WebAssembly.instantiateStreaming) {
      var origWasmStream = WebAssembly.instantiateStreaming;
      WebAssembly.instantiateStreaming = function(source) {
        try {
          if (source && typeof source.url === 'string' && isMinerUrl(source.url))
            return Promise.reject(new Error('Blocked by OS Browser'));
        } catch(e) {}
        return origWasmStream.apply(this, arguments);
      };
    }

    // Block known miner global objects
    ['CoinHive','CoinImp','Client','deepMiner','CRLT'].forEach(function(name) {
      try {
        Object.defineProperty(window, name, { configurable: true, get: function() { return undefined; }, set: function() {} });
      } catch(e) {}
    });
  } catch(e) {}
})();
`;

// ══════════════════════════════════════════════════════════════════════════════
// WEBRTC LEAK PREVENTION — prevents IP leaks via RTCPeerConnection
// ══════════════════════════════════════════════════════════════════════════════
const WEBRTC_LEAK_PREVENTION_SCRIPT = `
(function() {
  'use strict';
  try {
    if (window.__osBrowserWebRTCProtection) return;
    window.__osBrowserWebRTCProtection = true;

    var OrigRTC = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    if (!OrigRTC) return;

    window.RTCPeerConnection = function(config, constraints) {
      try {
        if (config && config.iceServers) {
          var h = location.hostname;
          var isCallPage = h.includes('govchat') || h.includes('meet') || h.includes('zoom') ||
                           h.includes('teams') || h.includes('whereby') || h.includes('jitsi') || h.includes('webrtc');
          if (!isCallPage) { config.iceTransportPolicy = 'relay'; }
        }
      } catch(e) {}
      return new OrigRTC(config, constraints);
    };
    window.RTCPeerConnection.prototype = OrigRTC.prototype;
    if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = window.RTCPeerConnection;
    if (window.mozRTCPeerConnection) window.mozRTCPeerConnection = window.RTCPeerConnection;
  } catch(e) {}
})();
`;

// ── Default whitelisted hostnames ─────────────────────────────────────────
const DEFAULT_GOV_WHITELIST_PATTERNS = ['*.gov.gh', '*.mil.gh', '*.edu.gh'];

export class AdBlockService {
  private blocker: ElectronBlocker | null = null;
  private enabled = true;
  private whitelistedSites = new Set<string>();
  private totalBlocked = 0;
  private totalBytesSaved = 0;
  private sessionBytesSaved = 0;
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private cachePath: string = '';

  constructor() {
    this.cachePath = '';
  }

  async initialize(): Promise<void> {
    this.cachePath = path.join(app.getPath('userData'), 'adblock-engine.bin');

    try {
      // Try loading from cache first (~50ms)
      if (fs.existsSync(this.cachePath)) {
        const buf = fs.readFileSync(this.cachePath);
        this.blocker = ElectronBlocker.deserialize(buf);
        console.log('[AdBlock] Loaded from cache');
      } else {
        // Download fresh filter lists (~2-5s)
        await this.downloadAndBuild();
      }
    } catch (err) {
      console.error('[AdBlock] Cache load failed, downloading fresh:', err);
      try {
        await this.downloadAndBuild();
      } catch (downloadErr) {
        console.error('[AdBlock] Download failed, creating empty blocker:', downloadErr);
        this.blocker = await ElectronBlocker.fromLists(fetch, []);
      }
    }

    if (this.blocker) {
      // YouTube domains to whitelist from network blocking (video streams use googlevideo.com)
      const YOUTUBE_WHITELIST = new Set([
        'www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com',
        'youtu.be', 'www.youtube-nocookie.com',
      ]);

      // Manual network blocking with YouTube whitelist
      // We DON'T use enableBlockingInSession because it blocks YouTube CDN requests
      // that share domains with legitimate video streams (googlevideo.com, ytimg.com)
      try {
        const blocker = this.blocker;
        const self = this;
        // Internal/app domains that should never be blocked
        const APP_WHITELIST_DOMAINS = [
          'askozzy.work',       // GovChat Matrix homeserver + API
          'govchat.askozzy.work',
          'osbrowser.askozzy.work',
          'os-browser-worker.ghwmelite.workers.dev',
        ];

        session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
          // Skip if ad blocking is globally disabled
          if (!self.enabled) { callback({}); return; }
          // Skip main frame requests (page navigations)
          if (details.resourceType === 'mainFrame') { callback({}); return; }

          // Whitelist internal app domains (GovChat, API, worker)
          try {
            const reqHost = new URL(details.url).hostname;
            if (APP_WHITELIST_DOMAINS.some(d => reqHost === d || reqHost.endsWith('.' + d))) {
              callback({}); return;
            }
          } catch {}

          // Whitelist YouTube: allow ALL requests from/to YouTube and Google domains
          // YouTube depends on dozens of Google subdomains for video delivery, auth, APIs
          try {
            const referrerHost = details.referrer ? new URL(details.referrer).hostname : '';
            const requestHost = new URL(details.url).hostname;

            // If the request comes FROM a YouTube page, allow everything
            const isFromYouTube = referrerHost.endsWith('youtube.com') || referrerHost.endsWith('youtu.be');
            if (isFromYouTube) { callback({}); return; }

            // Also whitelist YouTube/Google infrastructure domains regardless of referrer
            const isYouTubeInfra = requestHost.endsWith('.youtube.com') || requestHost.endsWith('.googlevideo.com') ||
              requestHost.endsWith('.ytimg.com') || requestHost.endsWith('.ggpht.com') ||
              YOUTUBE_WHITELIST.has(requestHost);
            if (isYouTubeInfra) { callback({}); return; }
          } catch {}

          // Check against filter engine
          try {
            const { Request } = require('@ghostery/adblocker');
            const request = Request.fromRawDetails({
              url: details.url,
              sourceUrl: details.referrer || '',
              type: (details.resourceType || 'other') as any,
            });
            const { match } = blocker.match(request);
            if (match) {
              self.totalBlocked++;
              const type = details.resourceType || '';
              const estimatedBytes = type === 'script' ? 45_000
                : type === 'image' ? 150_000
                : type === 'media' ? 2_000_000
                : type === 'xhr' || type === 'ping' ? 5_000
                : type === 'stylesheet' ? 30_000
                : type === 'font' ? 80_000
                : 20_000;
              self.totalBytesSaved += estimatedBytes;
              self.sessionBytesSaved += estimatedBytes;
              callback({ cancel: true });
              return;
            }
          } catch {}

          callback({});
        });
        console.log('[AdBlock] Network blocking enabled with YouTube whitelist');
      } catch {
        console.warn('[AdBlock] Network blocking unavailable. Cosmetic filtering and video ad blocking are still active.');
      }
    }

    // Register IPC handlers
    this.registerIPC();

    // Load persisted whitelist from database
    this.loadWhitelist();
    this.loadStats();

    // Save stats every 60 seconds
    this.statsTimer = setInterval(() => this.saveStats(), 60_000);

    // Schedule background updates every 24 hours
    this.updateTimer = setInterval(() => {
      this.downloadAndBuild().catch((err) => {
        console.error('[AdBlock] Background update failed:', err);
      });
    }, 24 * 60 * 60 * 1000);
  }

  private async downloadAndBuild(): Promise<void> {
    console.log('[AdBlock] Downloading filter lists...');
    this.blocker = await ElectronBlocker.fromLists(
      fetch,
      FILTER_LIST_URLS,
      { enableCompression: true },
      { path: this.cachePath, read: fs.promises.readFile, write: fs.promises.writeFile }
    );
    console.log('[AdBlock] Filter lists downloaded and cached');
  }

  /**
   * Apply cosmetic filters and platform-specific ad blocking to a WebContents.
   * Called on did-navigate and did-navigate-in-page events.
   */
  applyCosmeticFilters(wc: WebContents, url: string): void {
    if (!this.enabled || !url) return;

    // Skip internal pages
    if (url.startsWith('os-browser://') || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('chrome:')) return;


    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return;
    }

    // Skip whitelisted sites
    if (this.isSiteWhitelisted(hostname)) return;

    const isYouTube = hostname.endsWith('youtube.com') || hostname.endsWith('youtu.be');

    // ── Ghostery cosmetic filters (CSS hiding from filter lists) ──
    if (this.blocker) {
      try {
        const cosmetics = this.blocker.getCosmeticsFilters({
          url,
          hostname,
          domain: this.getDomain(hostname),
        });

        // CSS styles are always safe
        if (cosmetics.styles) {
          wc.insertCSS(cosmetics.styles).catch(() => {});
        }

        // Scriptlets use Proxy/Object.apply overrides that cause infinite recursion on YouTube
        if (!isYouTube && cosmetics.scripts && cosmetics.scripts.length > 0) {
          for (const script of cosmetics.scripts) {
            wc.executeJavaScript(script).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[AdBlock] Cosmetic filter error:', err);
      }
    }

    // ── Platform-specific video ad blocking ──

    // YouTube + YouTube Music — comprehensive ad blocking (fetch/XHR interception + auto-skip + CSS)
    // IMPORTANT: only the YOUTUBE_AD_BLOCK_SCRIPT runs here. The universal ad blocker, fingerprint,
    // crypto miner, and Ghostery scriptlets are EXCLUDED (they cause infinite recursion via Proxy).
    if (isYouTube) {
      wc.executeJavaScript(YOUTUBE_AD_BLOCK_SCRIPT).catch(() => {});
      return; // Skip ALL other scripts — they break the player via Proxy/fetch conflicts
    }

    // Twitch
    if (['www.twitch.tv', 'twitch.tv', 'm.twitch.tv'].includes(hostname)) {
      wc.executeJavaScript(TWITCH_AD_BLOCK_SCRIPT).catch(() => {});
    }

    // Facebook / Instagram
    if (['www.facebook.com', 'facebook.com', 'web.facebook.com', 'www.instagram.com', 'instagram.com'].includes(hostname)) {
      wc.executeJavaScript(FACEBOOK_AD_BLOCK_SCRIPT).catch(() => {});
    }

    // Twitter / X
    if (['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'].includes(hostname)) {
      wc.executeJavaScript(TWITTER_AD_BLOCK_SCRIPT).catch(() => {});
    }

    // TikTok
    if (hostname.endsWith('tiktok.com')) {
      wc.executeJavaScript(TIKTOK_AD_BLOCK_SCRIPT).catch(() => {});
    }

    // Dailymotion
    if (['www.dailymotion.com', 'dailymotion.com'].includes(hostname)) {
      wc.executeJavaScript(DAILYMOTION_AD_BLOCK_SCRIPT).catch(() => {});
    }

    // ── Universal video ad blocker — on video platforms EXCEPT YouTube ──
    // YouTube already returned above after YOUTUBE_MINIMAL_SCRIPT.
    if (VIDEO_PLATFORM_HOSTS.has(hostname) || hostname.endsWith('tiktok.com')) {
      wc.executeJavaScript(UNIVERSAL_VIDEO_AD_BLOCK_SCRIPT).catch(() => {});
      wc.executeJavaScript(NEWSLETTER_POPUP_BLOCK_SCRIPT).catch(() => {});
    }

    // ── Lightweight privacy protection ──
    // DEACTIVATED: Cookie consent, fingerprint, crypto miner scripts — too heavy for every page load
    // wc.executeJavaScript(COOKIE_CONSENT_BLOCK_SCRIPT).catch(() => {});
    // wc.executeJavaScript(FINGERPRINT_PROTECTION_SCRIPT).catch(() => {});
    // wc.executeJavaScript(CRYPTO_MINER_BLOCK_SCRIPT).catch(() => {});
    wc.executeJavaScript(WEBRTC_LEAK_PREVENTION_SCRIPT).catch(() => {});
  }

  /**
   * Check if a hostname matches government/whitelisted patterns
   */
  private isSiteWhitelisted(hostname: string): boolean {
    if (this.whitelistedSites.has(hostname)) return true;

    for (const pattern of DEFAULT_GOV_WHITELIST_PATTERNS) {
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(1);
        if (hostname.endsWith(suffix) || hostname === suffix.slice(1)) return true;
      } else if (hostname === pattern) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract domain from hostname (e.g. "www.example.com" -> "example.com")
   */
  private getDomain(hostname: string): string {
    const multiPartTlds = ['.co.uk', '.com.au', '.co.za', '.gov.gh', '.edu.gh', '.com.gh', '.org.gh', '.co.in', '.co.jp', '.com.br', '.co.kr'];
    for (const tld of multiPartTlds) {
      if (hostname.endsWith(tld)) {
        const withoutTld = hostname.slice(0, -tld.length);
        const parts = withoutTld.split('.');
        return parts[parts.length - 1] + tld;
      }
    }
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join('.');
  }

  private loadStats(): void {
    try {
      const db = getDatabase();
      db.prepare("CREATE TABLE IF NOT EXISTS adblock_stats (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0)").run();
      const row = db.prepare("SELECT * FROM adblock_stats WHERE key = 'lifetime'").get() as any;
      if (row) {
        this.totalBlocked = row.value || 0;
        // Load lifetime bytes from a separate row
        const bytesRow = db.prepare("SELECT * FROM adblock_stats WHERE key = 'lifetime_bytes'").get() as any;
        this.totalBytesSaved = bytesRow?.value || 0;
      }
    } catch {}
  }

  private saveStats(): void {
    try {
      const db = getDatabase();
      db.prepare("INSERT OR REPLACE INTO adblock_stats (key, value) VALUES ('lifetime', ?)").run(this.totalBlocked);
      db.prepare("INSERT OR REPLACE INTO adblock_stats (key, value) VALUES ('lifetime_bytes', ?)").run(this.totalBytesSaved);
    } catch {}
  }

  private loadWhitelist(): void {
    try {
      const db = getDatabase();
      const rows = db.prepare("SELECT hostname FROM adblock_whitelist").all() as any[];
      for (const row of rows) {
        if (row.hostname) this.whitelistedSites.add(row.hostname);
      }
    } catch {}
  }

  private saveWhitelist(): void {
    try {
      const db = getDatabase();
      db.prepare("DELETE FROM adblock_whitelist").run();
      for (const hostname of this.whitelistedSites) {
        db.prepare("INSERT INTO adblock_whitelist (hostname) VALUES (?)").run(hostname);
      }
    } catch {}
  }

  private registerIPC(): void {
    ipcMain.handle('adblock:get-status', () => {
      return {
        enabled: this.enabled,
        totalBlocked: this.totalBlocked,
        whitelistedSites: Array.from(this.whitelistedSites),
      };
    });

    ipcMain.handle('adblock:toggle-global', () => {
      this.enabled = !this.enabled;
      // Network blocking uses our custom onBeforeRequest handler which checks this.enabled
      return { enabled: this.enabled };
    });

    ipcMain.handle('adblock:toggle-site', (_event, hostname: string) => {
      if (typeof hostname !== 'string' || hostname.length > 256) return { whitelisted: false };
      if (this.whitelistedSites.has(hostname)) {
        this.whitelistedSites.delete(hostname);
      } else {
        this.whitelistedSites.add(hostname);
      }
      this.saveWhitelist();
      return { whitelisted: this.whitelistedSites.has(hostname) };
    });

    ipcMain.handle('adblock:is-site-enabled', (_event, hostname: string) => {
      if (typeof hostname !== 'string') return { enabled: false, isGovSite: false, isUserWhitelisted: false, globalEnabled: this.enabled };
      const isGov = this.isSiteWhitelisted(hostname);
      const isUserWhitelisted = this.whitelistedSites.has(hostname);
      return {
        enabled: this.enabled && !isUserWhitelisted && !isGov,
        isGovSite: isGov && !isUserWhitelisted,
        isUserWhitelisted,
        globalEnabled: this.enabled,
      };
    });

    ipcMain.handle('adblock:get-blocked-count', () => {
      return { totalBlocked: this.totalBlocked };
    });

    ipcMain.handle('adblock:get-data-savings', () => {
      return {
        totalBlocked: this.totalBlocked,
        sessionBytesSaved: this.sessionBytesSaved,
        totalBytesSaved: this.totalBytesSaved,
      };
    });
  }

  destroy(): void {
    // Persist stats before shutdown
    this.saveStats();
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
    if (this.blocker) {
      try {
        session.defaultSession.webRequest.onBeforeRequest(null);
      } catch {}
      this.blocker = null;
    }
    ipcMain.removeHandler('adblock:get-status');
    ipcMain.removeHandler('adblock:toggle-global');
    ipcMain.removeHandler('adblock:toggle-site');
    ipcMain.removeHandler('adblock:is-site-enabled');
    ipcMain.removeHandler('adblock:get-blocked-count');
    ipcMain.removeHandler('adblock:get-data-savings');
  }
}

// Singleton instance
let adBlockServiceInstance: AdBlockService | null = null;

export function getAdBlockService(): AdBlockService | null {
  return adBlockServiceInstance;
}

export function setAdBlockService(instance: AdBlockService): void {
  adBlockServiceInstance = instance;
}
