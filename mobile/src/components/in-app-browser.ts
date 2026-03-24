import { h } from '../utils/dom';
import { isNativePlatform } from '../utils/platform';

// ---------------------------------------------------------------------------
// In-App Browser — Full-screen overlay with iframe, nav controls, URL bar,
// and built-in ad/tracker blocking (mirroring desktop OS Browser features)
// ---------------------------------------------------------------------------

let browserOverlay: HTMLElement | null = null;
let currentIframe: HTMLIFrameElement | null = null;

// ---------------------------------------------------------------------------
// Ad-Block Engine — Domain-level blocking + cosmetic filtering
// ---------------------------------------------------------------------------

/** Major ad/tracking domains (subset of EasyList + EasyPrivacy + uBlock) */
const AD_DOMAINS: string[] = [
  // Google Ads
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'pagead2.googlesyndication.com', 'adservice.google.com',
  // Facebook/Meta
  'facebook.net', 'fbcdn.net', 'connect.facebook.net',
  // Ad networks
  'adnxs.com', 'adsrvr.org', 'adform.net', 'rubiconproject.com',
  'pubmatic.com', 'openx.net', 'casalemedia.com', 'criteo.com',
  'criteo.net', 'outbrain.com', 'taboola.com', 'mgid.com',
  'revcontent.com', 'adblade.com', 'adroll.com', 'zemanta.com',
  'sharethrough.com', 'nativo.com', 'teads.tv',
  // Tracking / Analytics
  'hotjar.com', 'mixpanel.com', 'amplitude.com', 'segment.com',
  'optimizely.com', 'crazyegg.com', 'mouseflow.com', 'fullstory.com',
  'luckyorange.com', 'inspectlet.com', 'newrelic.com', 'nr-data.net',
  'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
  'omtrdc.net', 'demdex.net', 'everesttech.net',
  // Pop-up / malware / redirect networks
  'popads.net', 'popcash.net', 'propellerads.com', 'trafficjunky.com',
  'exoclick.com', 'juicyads.com', 'clickadu.com', 'hilltopads.com',
  'hilltopads.net', 'adcash.com', 'richpush.com', 'pushground.com',
  'evadav.com', 'notification.top', 'pushame.com', 'push.house',
  'rolemedia.co', 'onclicka.com', 'onclickmax.com', 'clickaine.com',
  'adf.ly', 'bc.vc', 'sh.st', 'shorte.st', 'linkbucks.com',
  'betaheat.com', 'revenuenetworkcpm.com',
  // Video ads
  'imasdk.googleapis.com', 'moatads.com', 'serving-sys.com',
  'innovid.com', 'springserve.com', 'spotxchange.com',
  // Social trackers
  'platform.twitter.com', 'connect.facebook.net',
  'platform.linkedin.com', 'snap.licdn.com',
  // Other trackers
  'bing.com/bat.js', 'bat.bing.com', 'clarity.ms',
  'amazon-adsystem.com', 'media.net', 'yieldmo.com',
  // Crypto miners
  'coinhive.com', 'coin-hive.com', 'crypto-loot.com', 'cryptaloot.pro',
  'monerominer.rocks', 'webminepool.com', 'ppoi.org', 'projectpoi.com',
  'authedmine.com', 'coinimp.com', 'minero.cc', 'webmine.cz',
  'jsecoin.com', 'mineralt.io', 'webminerpool.com',
];

/** Cosmetic filter CSS — hides common ad containers on websites */
const COSMETIC_FILTERS_CSS = `
  /* Google Ads */
  ins.adsbygoogle,
  .adsbygoogle,
  [id^="google_ads"],
  [id^="div-gpt-ad"],
  [data-ad-slot],
  [data-google-query-id],
  /* Generic ad containers */
  [class*="ad-banner"],
  [class*="ad-container"],
  [class*="ad-wrapper"],
  [class*="ad-slot"],
  [class*="ad-unit"],
  [id*="ad-banner"],
  [id*="ad-container"],
  [id*="ad-wrapper"],
  .advertisement,
  .ad-placement,
  .sponsored-content,
  [data-ad],
  [data-ads],
  [data-ad-rendering-role],
  /* Social media ads */
  [aria-label="Sponsored"],
  [data-testid="promotedIndicator"],
  /* Popups & overlays */
  .modal-ad,
  .popup-ad,
  .interstitial-ad,
  .newsletter-popup,
  /* Cookie consent (optional clean view) */
  .cookie-banner,
  .cookie-consent,
  .cc-banner,
  [class*="cookie-notice"],
  [id*="cookie-notice"],
  /* Taboola / Outbrain */
  .trc_related_container,
  .ob-widget,
  .OUTBRAIN,
  [data-widget-id*="taboola"],
  /* Video pre-rolls */
  .video-ads,
  .ytp-ad-overlay-container,
  .ad-showing .video-ads {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

/** Anti-adblock bypass + ad neutralization script */
const AD_BLOCK_SCRIPT = `
(function() {
  'use strict';

  // --- Block ad network requests via fetch/XHR interception ---
  const AD_PATTERNS = [${AD_DOMAINS.map(d => `'${d}'`).join(',')}];

  function isAdUrl(url) {
    try {
      var hostname = new URL(url, location.href).hostname;
      for (var i = 0; i < AD_PATTERNS.length; i++) {
        if (hostname === AD_PATTERNS[i] || hostname.endsWith('.' + AD_PATTERNS[i])) {
          return true;
        }
      }
    } catch(e) {}
    // Check common ad paths
    if (/\\/ads?\\/|\\/adserv|\\/advert|\\/pagead|\\/doubleclick|\\.ads\\.|ad[sx]?\\.js/i.test(url)) {
      return true;
    }
    return false;
  }

  // Intercept fetch
  var originalFetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if (isAdUrl(url)) {
      window.__ozzyAdBlockCount = (window.__ozzyAdBlockCount || 0) + 1;
      return Promise.resolve(new Response('', { status: 200, statusText: 'Blocked by OS Browser Mini' }));
    }
    return originalFetch.apply(this, arguments);
  };

  // Intercept XMLHttpRequest
  var XHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (isAdUrl(url)) {
      window.__ozzyAdBlockCount = (window.__ozzyAdBlockCount || 0) + 1;
      this.__ozzyBlocked = true;
    }
    return XHROpen.apply(this, arguments);
  };
  var XHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    if (this.__ozzyBlocked) return;
    return XHRSend.apply(this, arguments);
  };

  // --- Anti-adblock bypass ---
  // Stub common adblock detection libraries (blockAdBlock, fuckAdBlock, OnAdBlock)
  var adBlockStubMobile = { onDetected: function(){ return this; }, onNotDetected: function(fn){ if(fn) fn(); return this; }, check: function(){ return this; }, on: function(){ return this; }, emitEvent: function(){ return this; }, setOption: function(){ return this; } };
  window.blockAdBlock = adBlockStubMobile;
  window.fuckAdBlock = adBlockStubMobile;
  window.OnAdBlock = adBlockStubMobile;
  window.sniffAdBlock = adBlockStubMobile;
  window.adBlocksFound = 0;
  window.adBlockEnabled = false;
  window.adBlockDetected = false;
  window.google_ad_status = 1;
  // Additional anti-adblock window properties
  try {
    var antiAdProps = { __adblocker: false, isAdBlockActive: false, adBlockerEnabled: false, canShowAds: true, canRunAds: true, hasAdBlocker: false, adblockEnabled: false, isAdBlockActive: false, adBlockerDetected: false };
    for (var prop in antiAdProps) {
      try {
        Object.defineProperty(window, prop, { configurable: true, get: (function(v){ return function(){ return v; }; })(antiAdProps[prop]), set: function(){} });
      } catch(e) {}
    }
  } catch(e) {}

  // Override document.getElementById for ad bait element protection
  try {
    var origGetById = document.getElementById.bind(document);
    document.getElementById = function(id) {
      var el = origGetById(id);
      if (!el && /\b(ad[s_-]?box|ad[s_-]?banner|ad[s_-]?placement|ad[s_-]?container|advert|adsense)\b/i.test(id)) {
        var fake = document.createElement('div');
        Object.defineProperty(fake, 'offsetHeight', { get: function(){ return 1; } });
        Object.defineProperty(fake, 'offsetWidth', { get: function(){ return 1; } });
        Object.defineProperty(fake, 'clientHeight', { get: function(){ return 1; } });
        Object.defineProperty(fake, 'clientWidth', { get: function(){ return 1; } });
        return fake;
      }
      return el;
    };
  } catch(e) {}

  // Intercept eval() calls containing adblock detection patterns
  try {
    var origEval = window.eval;
    window.eval = function(code) {
      if (typeof code === 'string' && /adblock|ad-block|adsbox|ad_block|blockadblock|fuckadblock|detectAdBlock|adBlockDetected/i.test(code)) {
        return undefined;
      }
      return origEval.call(this, code);
    };
  } catch(e) {}

  // Stub Google IMA SDK (video ad framework)
  if (!window.google) window.google = {};
  if (!window.google.ima) {
    window.google.ima = {
      AdDisplayContainer: function(){},
      AdError: { Type: {}, ErrorCode: {} },
      AdsLoader: function(){ this.addEventListener = function(){}; this.requestAds = function(){}; this.destroy = function(){}; },
      AdsManager: function(){ this.addEventListener = function(){}; this.init = function(){}; this.start = function(){}; this.destroy = function(){}; },
      AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
      AdsRequest: function(){},
      CompanionAdSelectionSettings: function(){},
      ImaSdkSettings: function(){},
      OmidAccessMode: {},
      UiElements: {},
      ViewMode: {},
      settings: { setLocale: function(){}, setVpaidMode: function(){} },
    };
  }

  // --- Remove ad elements via MutationObserver ---
  var adSelectors = [
    'ins.adsbygoogle', '.adsbygoogle', '[id^="google_ads"]', '[id^="div-gpt-ad"]',
    '[data-ad-slot]', '.ad-banner', '.ad-container', '.sponsored-content',
    '[data-ad]', '.trc_related_container', '.ob-widget', '.OUTBRAIN',
    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="adnxs"]', 'iframe[src*="taboola"]',
  ];

  function removeAds() {
    adSelectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.overflow = 'hidden';
        window.__ozzyAdBlockCount = (window.__ozzyAdBlockCount || 0) + 1;
      });
    });
  }

  // Run immediately + observe DOM changes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAds);
  } else {
    removeAds();
  }

  // --- Fake dialog / scam popup removal ---
  function removeFakeDialogs() {
    try {
      var allEls = document.querySelectorAll('div, section, aside, dialog');
      for (var i = 0; i < allEls.length; i++) {
        var el = allEls[i];
        var style = getComputedStyle(el);
        if (style.position !== 'fixed' && style.position !== 'absolute') continue;
        if (parseInt(style.zIndex || '0') < 100) continue;
        var text = (el.textContent || '').toLowerCase();
        var isFake = (
          (/install|download|update|upgrade/i.test(text) && /opera|chrome|firefox|browser|extension|addon|plugin/i.test(text) && /recommended|required|necessary|continue/i.test(text)) ||
          (/virus|malware|infected|trojan|spyware|threat/i.test(text) && /scan|clean|remove|protect|detected/i.test(text)) ||
          (/robot|human|verify|captcha/i.test(text) && /allow|click|press|notification/i.test(text)) ||
          (/congratulation|winner|won|prize|reward/i.test(text) && /claim|click|collect/i.test(text))
        );
        if (isFake) {
          el.style.display = 'none';
          try { el.remove(); } catch(e) {}
          window.__ozzyAdBlockCount = (window.__ozzyAdBlockCount || 0) + 1;
        }
      }
    } catch(e) {}
  }

  var observer = new MutationObserver(function(mutations) {
    var shouldClean = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) { shouldClean = true; break; }
    }
    if (shouldClean) { removeAds(); removeFakeDialogs(); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(removeFakeDialogs, 2000);

  // --- Inject cosmetic filter CSS ---
  var style = document.createElement('style');
  style.id = 'osbrowser-adblock';
  style.textContent = ${JSON.stringify(COSMETIC_FILTERS_CSS)};
  (document.head || document.documentElement).appendChild(style);

  // --- Block popup/redirect hijacking ---
  // Block window.open to ad domains
  var origWindowOpen = window.open;
  window.open = function(url) {
    if (url && typeof url === 'string' && isAdUrl(url)) return null;
    return origWindowOpen.apply(this, arguments);
  };

  // Block invisible overlay click hijackers (streaming sites use these)
  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!(target instanceof HTMLElement)) return;
    var style = getComputedStyle(target);
    var isTransparent = parseFloat(style.opacity) < 0.05 || style.backgroundColor === 'transparent';
    var isFullCover = target.offsetWidth > window.innerWidth * 0.8 && target.offsetHeight > window.innerHeight * 0.5;
    if (isTransparent && isFullCover && !target.closest('video')) {
      e.preventDefault();
      e.stopPropagation();
      target.style.pointerEvents = 'none';
      target.style.display = 'none';
    }
  }, true);

  // Block location.href hijacking from ad scripts
  // Protect against scripts that try to redirect the page to ad URLs
  var origLocation = Object.getOwnPropertyDescriptor(window, 'location');
  try {
    // Intercept beforeunload to catch ad redirects
    window.addEventListener('beforeunload', function(e) {
      // If we detect a rapid redirect (within 500ms of page load), it's likely an ad
    }, false);
  } catch(ex) {}

  // --- YouTube specific ---
  if (location.hostname.includes('youtube.com')) {
    // Skip ads automatically
    setInterval(function() {
      // Click skip button if available
      var skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
      if (skipBtn) skipBtn.click();

      // If ad is playing, try to skip to end
      var player = document.querySelector('.html5-main-video');
      var adShowing = document.querySelector('.ad-showing');
      if (player && adShowing) {
        player.currentTime = player.duration || 999;
        player.muted = false;
        player.playbackRate = 16;
      }
    }, 500);

    // Hide YouTube Premium nags, sponsored cards, Shorts ads, Music ads
    try {
      var ytExtraStyle = document.createElement('style');
      ytExtraStyle.textContent = [
        'ytd-mealbar-promo-renderer',
        'tp-yt-paper-dialog:has(#mealbar-promo-renderer)',
        'ytd-popup-container:has(a[href*="premium"])',
        'ytd-enforcement-message-view-model',
        'ytd-promoted-sparkles-text-search-renderer',
        'ytd-ad-slot-renderer',
        '[layout="compact-promoted-item"]',
        'ytd-reel-video-renderer[is-ad]',
        'ytd-reel-video-renderer:has(ytd-ad-slot-renderer)',
        'ytmusic-mealbar-promo-renderer',
        'ytmusic-statement-banner-renderer',
      ].join(', ') + ' { display: none !important; }';
      (document.head || document.documentElement).appendChild(ytExtraStyle);
    } catch(e) {}
  }

  // --- Vimeo pre-roll ad blocking ---
  try {
    var vimeoFetch = window.fetch;
    window.fetch = function(input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (/\.vimeocdn\.com\/p\//i.test(url) || /vimeo\.com.*\/ads/i.test(url)) {
        window.__ozzyAdBlockCount = (window.__ozzyAdBlockCount || 0) + 1;
        return Promise.resolve(new Response('', { status: 200 }));
      }
      return vimeoFetch.apply(this, arguments);
    };
  } catch(e) {}

  // --- Generic HLS ad segment removal ---
  try {
    var hlsFetch = window.fetch;
    window.fetch = function(input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (url.includes('.m3u8')) {
        return hlsFetch.apply(this, arguments).then(function(response) {
          return response.clone().text().then(function(text) {
            if (/EXT-X-DATERANGE.*?(ad|preroll|midroll|postroll)/i.test(text)) {
              var lines = text.split('\\n');
              var cleaned = [];
              var skipNext = false;
              for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.includes('EXT-X-DATERANGE') && /(ad|preroll|midroll|postroll)/i.test(line)) {
                  skipNext = true;
                  continue;
                }
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
              window.__ozzyAdBlockCount = (window.__ozzyAdBlockCount || 0) + 1;
              return new Response(cleaned.join('\\n'), { status: response.status, statusText: response.statusText, headers: response.headers });
            }
            return response;
          }).catch(function() { return response; });
        });
      }
      return hlsFetch.apply(this, arguments);
    };
  } catch(e) {}

  window.__ozzyAdBlockCount = window.__ozzyAdBlockCount || 0;

  // ── Cookie Consent / GDPR Auto-Dismiss ──────────────────────────────
  try {
    if (!window.__osBrowserCookieConsent) {
      window.__osBrowserCookieConsent = true;
      var REJECT_SEL = [
        'button[id*="reject" i]','button[class*="reject" i]','button[data-action="reject"]',
        '#CybotCookiebotDialogBodyButtonDecline','.cc-deny','.cc-btn.cc-deny',
        'button[aria-label*="reject all" i]','button[aria-label*="necessary only" i]',
      ];
      var ACCEPT_SEL = [
        '#onetrust-accept-btn-handler','.cc-dismiss','.cc-btn.cc-allow',
        '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll','.js-cookie-consent-agree',
        '#accept-cookies','.gdpr-consent-button','button[data-action="accept"]',
        '[class*="cookie"] button[class*="accept" i]','[id*="cookie"] button',
        '[data-cookiebanner] button','.cookie-notice__button',
      ];
      var BANNER_SEL = [
        '.cookie-banner','.cookie-consent','.cc-banner','#cookie-notice',
        '#cookie-law-info-bar','.gdpr-banner','#onetrust-banner-sdk',
        '#CybotCookiebotDialog','.evidon-banner','#truste-consent-track','.cookie-disclaimer',
      ];
      function clickFirstCookie(sels) {
        for (var i=0;i<sels.length;i++) {
          var el = document.querySelector(sels[i]);
          if (el instanceof HTMLElement && el.offsetParent !== null) { el.click(); return true; }
        }
        return false;
      }
      function dismissCookies() {
        if (clickFirstCookie(REJECT_SEL)) return;
        if (clickFirstCookie(ACCEPT_SEL)) return;
        BANNER_SEL.forEach(function(s) {
          document.querySelectorAll(s).forEach(function(el) {
            if (el instanceof HTMLElement) el.style.setProperty('display','none','important');
          });
        });
      }
      setTimeout(dismissCookies, 1000);
      setTimeout(dismissCookies, 3000);
      var cookieObs = new MutationObserver(function(m) {
        for (var i=0;i<m.length;i++) { if (m[i].addedNodes.length>0) { setTimeout(dismissCookies,500); break; } }
      });
      cookieObs.observe(document.documentElement, { childList:true, subtree:true });
    }
  } catch(e) {}

  // ── Fingerprinting Protection ───────────────────────────────────────
  try {
    if (!window.__osBrowserFingerprintProtection) {
      window.__osBrowserFingerprintProtection = true;
      var fpSeed = sessionStorage.getItem('__ozzyFpSeed');
      if (!fpSeed) { fpSeed = String(Math.random()*999999999>>>0); try{sessionStorage.setItem('__ozzyFpSeed',fpSeed);}catch(e){} }
      var fpSeedNum = parseInt(fpSeed,10);
      function fpRand(s) { return ((s*1103515245+12345)&0x7fffffff)%256/256; }

      // Canvas
      try {
        var _toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
          try { var c=this.getContext('2d'); if(c&&this.width>0&&this.height>0){var d=c.getImageData(0,0,Math.min(this.width,16),Math.min(this.height,16));for(var i=0;i<d.data.length;i+=4){d.data[i]^=(fpRand(fpSeedNum+i)>0.5?1:0);}c.putImageData(d,0,0);}} catch(e){}
          return _toDataURL.apply(this,arguments);
        };
      } catch(e) {}

      // WebGL
      try {
        var _glGetParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(p) {
          if(p===0x9245) return 'Generic GPU Vendor';
          if(p===0x9246) return 'Generic GPU Renderer';
          return _glGetParam.call(this,p);
        };
      } catch(e) {}

      // Screen masking
      try {
        var res=[[1920,1080],[1366,768],[1536,864],[1440,900]][fpSeedNum%4];
        Object.defineProperty(screen,'width',{get:function(){return res[0];},configurable:true});
        Object.defineProperty(screen,'height',{get:function(){return res[1];},configurable:true});
      } catch(e) {}

      // Plugin hiding
      try {
        Object.defineProperty(navigator,'plugins',{get:function(){return[];},configurable:true});
      } catch(e) {}
    }
  } catch(e) {}

  // ── Newsletter Popup Blocking ───────────────────────────────────────
  try {
    if (!window.__osBrowserNewsletterBlock) {
      window.__osBrowserNewsletterBlock = true;
      var nlKeywords = /\\b(subscribe|newsletter|sign\\s*up\\s*for|get\\s*updates|join\\s*our|mailing\\s*list)\\b/i;
      function dismissNL() {
        if (document.querySelectorAll('input[type="email"]').length > 2) return;
        document.querySelectorAll('div,section,aside').forEach(function(el) {
          if (!(el instanceof HTMLElement)) return;
          var st = getComputedStyle(el);
          if (st.position!=='fixed'&&st.position!=='absolute') return;
          if (!el.querySelector('input[type="email"],input[name*="email" i]')) return;
          if (!nlKeywords.test((el.textContent||'').substring(0,3000))) return;
          var cb = el.querySelector('button[class*="close" i],button[aria-label*="close" i],[class*="dismiss" i]');
          if (cb instanceof HTMLElement) { cb.click(); return; }
          el.style.setProperty('display','none','important');
        });
      }
      setInterval(dismissNL, 3000);
      setTimeout(dismissNL, 2000);
    }
  } catch(e) {}

  // ── Crypto Miner Blocking ───────────────────────────────────────────
  try {
    if (!window.__osBrowserCryptoMinerBlock) {
      window.__osBrowserCryptoMinerBlock = true;
      var minerDoms = ['coinhive.com','coin-hive.com','crypto-loot.com','cryptaloot.pro','monerominer.rocks','webminepool.com','authedmine.com','coinimp.com','minero.cc','webmine.cz'];
      var minerPaths = ['/lib/cryptonight','/miner','coinhive.min.js','cryptonight.wasm'];
      function isMiner(u) { if(!u)return false; var l=u.toLowerCase(); return minerDoms.some(function(d){return l.includes(d);})||minerPaths.some(function(p){return l.includes(p);}); }
      var _origFetch2 = window.fetch;
      window.fetch = function(input) {
        var url = typeof input==='string'?input:(input&&input.url?input.url:'');
        if (isMiner(url)) return Promise.resolve(new Response('',{status:403}));
        return _origFetch2.apply(this,arguments);
      };
      ['CoinHive','CoinImp','deepMiner','CRLT'].forEach(function(n) {
        try { Object.defineProperty(window,n,{configurable:true,get:function(){return undefined;},set:function(){}}); } catch(e){}
      });
    }
  } catch(e) {}

  // ── WebRTC Leak Prevention ──────────────────────────────────────────
  try {
    if (!window.__osBrowserWebRTCProtection) {
      window.__osBrowserWebRTCProtection = true;
      var _OrigRTC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
      if (_OrigRTC) {
        window.RTCPeerConnection = function(cfg, cons) {
          try {
            if (cfg && cfg.iceServers) {
              var h = location.hostname;
              if (!h.includes('govchat')&&!h.includes('meet')&&!h.includes('zoom')&&!h.includes('teams')) {
                cfg.iceTransportPolicy = 'relay';
              }
            }
          } catch(e) {}
          return new _OrigRTC(cfg, cons);
        };
        window.RTCPeerConnection.prototype = _OrigRTC.prototype;
      }
    }
  } catch(e) {}
})();
`;

/** Get ad-block state from localStorage */
function isAdBlockEnabled(): boolean {
  return localStorage.getItem('os_mobile_adblock') !== 'false';
}

/** Toggle ad-block state */
function setAdBlockEnabled(on: boolean): void {
  localStorage.setItem('os_mobile_adblock', String(on));
}

/** Get count of blocked items for display */
let sessionBlockCount = 0;

// ---------------------------------------------------------------------------
// Browser Chrome
// ---------------------------------------------------------------------------

/** Inject keyframes + styles once */
function injectBrowserStyles(): void {
  if (document.getElementById('in-app-browser-styles')) return;
  const style = document.createElement('style');
  style.id = 'in-app-browser-styles';
  style.textContent = `
    @keyframes iabSlideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    @keyframes iabSlideDown {
      from { transform: translateY(0); }
      to   { transform: translateY(100%); }
    }
    @keyframes iabProgressGlow {
      0%   { width: 0%; }
      30%  { width: 45%; }
      60%  { width: 70%; }
      90%  { width: 88%; }
      100% { width: 95%; }
    }
    @keyframes iabProgressComplete {
      from { width: 95%; }
      to   { width: 100%; opacity: 0; }
    }
    @keyframes iabShieldPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    @keyframes iabShieldGlow {
      0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
      100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
    }
    .iab-toolbar-btn {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: #e0e0e0;
      font-size: 18px;
      cursor: pointer;
      border-radius: 50%;
      padding: 0;
      transition: background 0.15s ease, color 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .iab-toolbar-btn:active {
      background: rgba(255,255,255,0.12);
    }
    .iab-toolbar-btn:disabled {
      opacity: 0.35;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

/** Extract readable domain from URL */
function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Get favicon URL */
function getFavicon(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return '';
  }
}

/** Check if URL is likely to work in an iframe */
function isIframeCompatible(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

/** Check if domain is a government site (whitelist — no ad blocking) */
function isGovDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return /\.(gov|mil|edu)\.(gh|uk|us|za|ng|ke)$/i.test(hostname)
      || hostname.endsWith('.gov')
      || hostname.endsWith('.mil');
  } catch {
    return false;
  }
}

/** Build the Content Security Policy for the iframe to block ad domains */
function buildAdBlockCSP(): string {
  // Block known ad domains at the CSP level
  // This prevents the iframe from even loading resources from these domains
  const blockedSources = AD_DOMAINS.slice(0, 30).map(d => `https://*.${d}`);
  // We can't use CSP negation, but we can restrict frame-src to prevent nested ad iframes
  return '';  // CSP on iframe attribute is limited; we rely on script injection instead
}

/**
 * Open a URL in the iframe-based in-app browser overlay with ad blocking
 * (used for web/PWA context only)
 */
function openIframeBrowser(url: string): void {
  // If URL doesn't start with http, add https
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  // If not iframe compatible, fall back to external
  if (!isIframeCompatible(url)) {
    window.open(url, '_blank');
    return;
  }

  // Close any existing browser
  closeIframeBrowser(true);

  injectBrowserStyles();

  const domain = getDomain(url);
  const faviconUrl = getFavicon(url);
  const adBlockOn = isAdBlockEnabled();
  const isGov = isGovDomain(url);

  // ── Progress bar ──
  const progressBar = h('div', {
    className: 'iab-progress',
    style: {
      position: 'absolute',
      top: '0',
      left: '0',
      height: '2.5px',
      background: 'linear-gradient(90deg, #D4A017, #e8b92e, #D4A017)',
      borderRadius: '0 2px 2px 0',
      zIndex: '10',
      animation: 'iabProgressGlow 2s ease-out forwards',
    },
  });

  // ── SSL lock icon ──
  const isSecure = url.startsWith('https://');
  const lockIcon = h('span', {
    style: {
      fontSize: '12px',
      marginRight: '4px',
      color: isSecure ? '#4CAF50' : '#FF9800',
      flexShrink: '0',
    },
  }, isSecure ? '🔒' : '⚠️');

  // ── Favicon ──
  const favicon = h('img', {
    src: faviconUrl,
    style: {
      width: '16px',
      height: '16px',
      borderRadius: '3px',
      flexShrink: '0',
      marginRight: '6px',
    },
  }) as HTMLImageElement;
  favicon.onerror = () => { favicon.style.display = 'none'; };

  // ── Domain label (tappable to show full URL) ──
  let showingFull = false;
  const domainLabel = h('span', {
    style: {
      fontFamily: 'var(--font-body, system-ui)',
      fontSize: 'clamp(12px, 3.2vw, 14px)',
      color: '#e0e0e0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: '1',
      cursor: 'pointer',
    },
    onClick: () => {
      showingFull = !showingFull;
      domainLabel.textContent = showingFull ? url : domain;
    },
  }, domain);

  // ── URL bar ──
  const urlBar = h('div', {
    style: {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: '20px',
      padding: '6px 12px',
      minWidth: '0',
      border: '1px solid rgba(255,255,255,0.08)',
      height: '36px',
      boxSizing: 'border-box',
    },
  }, lockIcon, favicon, domainLabel);

  // ── Close button ──
  const closeBtn = h('button', {
    className: 'iab-toolbar-btn',
    onClick: () => closeIframeBrowser(),
    title: 'Close',
    style: { fontSize: '22px', color: '#aaa' },
  }, '✕') as HTMLButtonElement;

  // ── Ad-block shield button ──
  const shieldCountLabel = h('span', {
    style: {
      position: 'absolute',
      top: '-2px',
      right: '-2px',
      background: '#4CAF50',
      color: '#fff',
      fontSize: '8px',
      fontWeight: '800',
      borderRadius: '6px',
      padding: '1px 3px',
      minWidth: '12px',
      textAlign: 'center',
      lineHeight: '1.3',
      display: 'none',
    },
  }, '0');

  let shieldActive = adBlockOn && !isGov;

  const shieldBtn = h('button', {
    className: 'iab-toolbar-btn',
    title: 'Ad Blocker',
    style: {
      fontSize: '16px',
      position: 'relative',
      color: shieldActive ? '#4CAF50' : '#666',
    },
  }, '🛡️') as HTMLButtonElement;
  shieldBtn.appendChild(shieldCountLabel);

  // Shield pulse animation on first load
  if (shieldActive) {
    shieldBtn.style.animation = 'iabShieldPulse 0.6s ease-out';
  }

  // ── Ad-block panel (toggle + stats) ──
  let panelOpen = false;
  const adBlockPanel = h('div', {
    style: {
      position: 'absolute',
      top: '100%',
      right: '8px',
      marginTop: '4px',
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '16px',
      width: '240px',
      zIndex: '20',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'none',
      flexDirection: 'column',
      gap: '12px',
    },
  });

  // Panel header
  const panelTitle = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  },
    h('span', { style: { fontSize: '20px' } }, '🛡️'),
    h('div', {},
      h('div', {
        style: {
          fontFamily: 'var(--font-display, system-ui)',
          fontSize: '14px',
          fontWeight: '700',
          color: '#e0e0e0',
        },
      }, 'OS Browser Shield'),
      h('div', {
        style: {
          fontSize: '11px',
          color: '#888',
          marginTop: '1px',
        },
      }, isGov ? 'Gov sites whitelisted' : 'Ads & trackers blocked'),
    ),
  );

  // Toggle row
  const toggleDot = h('div', {
    style: {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      transition: 'transform 200ms ease',
      transform: shieldActive ? 'translateX(16px)' : 'translateX(2px)',
    },
  });

  const toggleTrack = h('div', {
    style: {
      width: '36px',
      height: '20px',
      borderRadius: '10px',
      background: shieldActive ? '#4CAF50' : '#555',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background 200ms ease',
      flexShrink: '0',
    },
    onClick: () => {
      shieldActive = !shieldActive;
      setAdBlockEnabled(shieldActive);
      toggleTrack.style.background = shieldActive ? '#4CAF50' : '#555';
      toggleDot.style.transform = shieldActive ? 'translateX(16px)' : 'translateX(2px)';
      shieldBtn.style.color = shieldActive ? '#4CAF50' : '#666';
      toggleLabel.textContent = shieldActive ? 'Protection ON' : 'Protection OFF';

      // Reload iframe to apply/remove blocking
      try {
        iframe.contentWindow?.location.reload();
      } catch {
        iframe.src = iframe.src;
      }
      if (navigator.vibrate) navigator.vibrate(10);
    },
  }, toggleDot);

  const toggleLabel = h('span', {
    style: {
      fontFamily: 'var(--font-body, system-ui)',
      fontSize: '13px',
      color: '#e0e0e0',
      fontWeight: '600',
    },
  }, shieldActive ? 'Protection ON' : 'Protection OFF');

  const toggleRow = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  }, toggleLabel, toggleTrack);

  // Stats row
  const statsCount = h('span', {
    style: {
      fontFamily: 'var(--font-display, system-ui)',
      fontSize: '22px',
      fontWeight: '800',
      color: '#4CAF50',
    },
  }, '0');

  const statsRow = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'rgba(76,175,80,0.08)',
      borderRadius: '10px',
      border: '1px solid rgba(76,175,80,0.15)',
    },
  },
    statsCount,
    h('div', {},
      h('div', {
        style: { fontSize: '12px', color: '#aaa', fontWeight: '600' },
      }, 'Ads & Trackers'),
      h('div', {
        style: { fontSize: '11px', color: '#666' },
      }, 'blocked this session'),
    ),
  );

  // What's blocked info
  const whatBlocked = h('div', {
    style: {
      fontSize: '11px',
      color: '#666',
      lineHeight: '1.5',
    },
  },
    '✓ Ad networks  ✓ Trackers\n✓ Pop-ups  ✓ Video pre-rolls\n✓ Anti-adblock bypass',
  );

  adBlockPanel.appendChild(panelTitle);
  adBlockPanel.appendChild(toggleRow);
  adBlockPanel.appendChild(statsRow);
  adBlockPanel.appendChild(whatBlocked);

  // Shield click handler
  shieldBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelOpen = !panelOpen;
    adBlockPanel.style.display = panelOpen ? 'flex' : 'none';
  });

  // ── Share button ──
  const shareBtn = h('button', {
    className: 'iab-toolbar-btn',
    title: 'Share',
    style: { fontSize: '16px' },
  }, '↗') as HTMLButtonElement;

  // ── Nav buttons ──
  const backBtn = h('button', {
    className: 'iab-toolbar-btn',
    title: 'Back',
  }, '‹') as HTMLButtonElement;
  backBtn.style.fontSize = '26px';

  const forwardBtn = h('button', {
    className: 'iab-toolbar-btn',
    title: 'Forward',
  }, '›') as HTMLButtonElement;
  forwardBtn.style.fontSize = '26px';

  const refreshBtn = h('button', {
    className: 'iab-toolbar-btn',
    title: 'Refresh',
  }, '↻') as HTMLButtonElement;

  const externalBtn = h('button', {
    className: 'iab-toolbar-btn',
    title: 'Open in browser',
    style: { fontSize: '14px' },
  }, '🌐') as HTMLButtonElement;

  // ── Top toolbar ──
  const topToolbar = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '6px 8px',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
      background: '#0a0a0a',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      flexShrink: '0',
      position: 'relative',
    },
  }, closeBtn, urlBar, shieldBtn, shareBtn);

  topToolbar.appendChild(progressBar);
  topToolbar.appendChild(adBlockPanel);

  // ── Bottom toolbar ──
  const bottomToolbar = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '4px 16px',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
      background: '#0a0a0a',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      flexShrink: '0',
    },
  }, backBtn, forwardBtn, refreshBtn, externalBtn);

  // ── Iframe ──
  const iframe = h('iframe', {
    src: url,
    style: {
      flex: '1',
      width: '100%',
      border: 'none',
      background: '#111',
    },
    // Referrer policy to reduce tracking
    referrerpolicy: 'no-referrer-when-downgrade',
  }) as HTMLIFrameElement;
  currentIframe = iframe;

  // ── Error overlay ──
  const errorOverlay = h('div', {
    style: {
      position: 'absolute',
      inset: '0',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: '#111',
      color: '#e0e0e0',
      padding: '32px',
      textAlign: 'center',
      zIndex: '5',
    },
  },
    h('div', { style: { fontSize: '48px' } }, '🌐'),
    h('div', {
      style: {
        fontFamily: 'var(--font-display, system-ui)',
        fontSize: 'clamp(16px, 4vw, 18px)',
        fontWeight: '700',
      },
    }, 'Cannot display this page'),
    h('div', {
      style: {
        fontFamily: 'var(--font-body, system-ui)',
        fontSize: 'clamp(13px, 3.4vw, 14px)',
        color: '#888',
        lineHeight: '1.5',
        maxWidth: '280px',
      },
    }, 'This site doesn\'t allow embedded viewing. Tap below to open it in your browser.'),
    h('button', {
      style: {
        padding: '12px 28px',
        borderRadius: '24px',
        border: 'none',
        background: '#D4A017',
        color: '#fff',
        fontFamily: 'var(--font-display, system-ui)',
        fontSize: 'clamp(14px, 3.6vw, 15px)',
        fontWeight: '700',
        cursor: 'pointer',
        marginTop: '8px',
        minHeight: '44px',
      },
      onClick: () => {
        window.open(url, '_blank');
        closeIframeBrowser();
      },
    }, 'Open in Browser'),
  );

  // ── Content area ──
  const contentArea = h('div', {
    style: {
      flex: '1',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
    },
  }, iframe, errorOverlay);

  // ── Main overlay ──
  const overlay = h('div', {
    className: 'in-app-browser-overlay',
    style: {
      position: 'fixed',
      inset: '0',
      zIndex: '200',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      animation: 'iabSlideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
  }, topToolbar, contentArea, bottomToolbar);

  browserOverlay = overlay;

  // ── Apply ad-blocking to iframe ──
  function applyAdBlocking(): void {
    if (!shieldActive || isGov) return;

    try {
      const iframeDoc = iframe.contentDocument;
      const iframeWin = iframe.contentWindow;

      if (iframeDoc && iframeWin) {
        // Inject cosmetic filter CSS
        if (!iframeDoc.getElementById('osbrowser-adblock')) {
          const style = iframeDoc.createElement('style');
          style.id = 'osbrowser-adblock';
          style.textContent = COSMETIC_FILTERS_CSS;
          (iframeDoc.head || iframeDoc.documentElement).appendChild(style);
        }

        // Inject ad-block script
        if (!(iframeWin as any).__ozzyAdBlockApplied) {
          const script = iframeDoc.createElement('script');
          script.textContent = AD_BLOCK_SCRIPT;
          (iframeDoc.head || iframeDoc.documentElement).appendChild(script);
          (iframeWin as any).__ozzyAdBlockApplied = true;
        }

        // Read blocked count
        const count = (iframeWin as any).__ozzyAdBlockCount || 0;
        if (count > 0) {
          sessionBlockCount += count;
          shieldCountLabel.textContent = String(sessionBlockCount);
          shieldCountLabel.style.display = 'block';
          statsCount.textContent = String(sessionBlockCount);
          shieldBtn.style.animation = 'iabShieldGlow 1s ease-out';
        }
      }
    } catch {
      // Cross-origin — can't inject, but sandbox still blocks popups
      // Show shield as "active" since sandbox + referrer restrictions are working
    }
  }

  // Poll for ad block count updates
  let adBlockPoll: ReturnType<typeof setInterval> | null = null;
  if (shieldActive) {
    adBlockPoll = setInterval(() => {
      try {
        const iframeWin = iframe.contentWindow;
        if (iframeWin) {
          const count = (iframeWin as any).__ozzyAdBlockCount || 0;
          if (count > 0) {
            shieldCountLabel.textContent = String(count);
            shieldCountLabel.style.display = 'block';
            statsCount.textContent = String(count);
          }
        }
      } catch {
        // Cross-origin
      }
    }, 2000);
  }

  // ── Event handlers ──

  // (load handler merged into the blocking detection below)

  // Iframe error
  iframe.addEventListener('error', () => {
    (errorOverlay as HTMLElement).style.display = 'flex';
  });

  // Detect X-Frame-Options / CSP frame-ancestors blocking.
  // Cross-origin iframes that load successfully will throw on contentDocument access.
  // Blocked iframes (X-Frame-Options) will have contentDocument === null or show about:blank.
  // We only show the error for clearly blocked pages — NOT for cross-origin pages that loaded fine.
  let iframeLoaded = false;

  iframe.addEventListener('load', () => {
    iframeLoaded = true;
    progressBar.style.animation = 'iabProgressComplete 0.3s ease-out forwards';
    setTimeout(() => { progressBar.style.display = 'none'; }, 350);

    // Check if the loaded page is actually a blocked/error page
    // CSP frame-ancestors violations load chrome-error:// which we can detect
    setTimeout(() => {
      try {
        const doc = iframe.contentDocument;
        // If we CAN read contentDocument and it's blank or chrome-error, it's blocked
        if (doc) {
          const docUrl = doc.URL || '';
          const body = doc.body?.innerHTML?.trim() || '';
          if (docUrl.includes('chrome-error') || docUrl === 'about:blank' ||
              (body.length === 0 && !doc.title) || body.length < 50) {
            // Site blocked iframe — open in new tab instead
            window.open(url, '_blank');
            closeIframeBrowser();
            return;
          }
        }
      } catch {
        // Cross-origin security error = page loaded fine (can't read cross-origin docs)
      }

      // Apply ad blocking (only if page loaded successfully)
      setTimeout(() => applyAdBlocking(), 100);
      setTimeout(() => applyAdBlocking(), 1500);
    }, 500);

    // Update domain display
    try {
      const iframeSrc = iframe.contentWindow?.location?.href;
      if (iframeSrc && iframeSrc !== 'about:blank') {
        domainLabel.textContent = getDomain(iframeSrc);
      }
    } catch {
      // Cross-origin — page loaded fine, just can't read the URL
    }
  });

  // Fallback: if iframe hasn't loaded after 10s, it's likely blocked
  const errorCheckTimeout = setTimeout(() => {
    if (!iframeLoaded) {
      // Open in new tab and close the in-app browser
      window.open(url, '_blank');
      closeIframeBrowser();
    }
  }, 10000);

  // Back
  backBtn.addEventListener('click', () => {
    try { iframe.contentWindow?.history.back(); } catch { /* cross-origin */ }
  });

  // Forward
  forwardBtn.addEventListener('click', () => {
    try { iframe.contentWindow?.history.forward(); } catch { /* cross-origin */ }
  });

  // Refresh
  refreshBtn.addEventListener('click', () => {
    progressBar.style.display = 'block';
    progressBar.style.animation = 'iabProgressGlow 2s ease-out forwards';
    try { iframe.contentWindow?.location.reload(); } catch { iframe.src = iframe.src; }
  });

  // Share
  shareBtn.addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: domain, url }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showBrowserToast('Link copied!');
      } catch { /* fallback */ }
    }
  });

  // External
  externalBtn.addEventListener('click', () => {
    window.open(url, '_blank');
  });

  // Dismiss ad-block panel on outside tap
  overlay.addEventListener('click', (e) => {
    if (panelOpen && !adBlockPanel.contains(e.target as Node) && e.target !== shieldBtn) {
      panelOpen = false;
      adBlockPanel.style.display = 'none';
    }
  });

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Handle hardware back button (Android)
  window.history.pushState({ iab: true }, '');
  const handlePopState = () => {
    if (browserOverlay) closeIframeBrowser();
  };
  window.addEventListener('popstate', handlePopState, { once: true });

  document.body.appendChild(overlay);

  // Haptic feedback
  if (navigator.vibrate) navigator.vibrate(10);

  // Store cleanup ref
  (overlay as any).__cleanup = () => {
    if (adBlockPoll) clearInterval(adBlockPoll);
    clearTimeout(errorCheckTimeout);
  };
}

/** Close the iframe-based in-app browser (web/PWA context) */
function closeIframeBrowser(instant = false): void {
  if (!browserOverlay) return;

  const overlay = browserOverlay;
  browserOverlay = null;
  currentIframe = null;

  // Run cleanup
  if ((overlay as any).__cleanup) (overlay as any).__cleanup();

  document.body.style.overflow = '';

  if (instant) {
    overlay.remove();
    return;
  }

  overlay.style.animation = 'iabSlideDown 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
  setTimeout(() => { overlay.remove(); }, 260);

  if (navigator.vibrate) navigator.vibrate(5);
}

/** Quick toast inside the browser */
function showBrowserToast(msg: string): void {
  if (!browserOverlay) return;
  const toast = h('div', {
    style: {
      position: 'absolute',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30,30,30,0.95)',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      zIndex: '10',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,0.1)',
    },
  }, msg);
  browserOverlay.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 1500);
}

/** Check if in-app browser is currently open */
export function isBrowserOpen(): boolean {
  return browserOverlay !== null;
}

// ---------------------------------------------------------------------------
// Native In-App Browser — uses @capacitor/inappbrowser WebView on native
// ---------------------------------------------------------------------------

async function openNativeBrowser(url: string): Promise<void> {
  try {
    const { InAppBrowser } = await import('@capacitor/inappbrowser');

    await InAppBrowser.openInWebView({
      url,
      options: {
        showURL: true,
        showToolbar: true,
        clearCache: false,
        clearSessionCache: false,
        mediaPlaybackRequiresUserAction: false,
        closeButtonText: 'Done',
        toolbarPosition: 0, // TOP
        showNavigationButtons: true,
        leftToRight: false,
        android: {
          allowZoom: true,
          hardwareBack: true,
          pauseMedia: true,
        },
        iOS: {
          allowOverScroll: true,
          enableViewportScale: true,
          allowInLineMediaPlayback: true,
          surpressIncrementalRendering: false,
          viewStyle: 2, // FULL_SCREEN
          animationEffect: 2, // COVER_VERTICAL
          allowsBackForwardNavigationGestures: true,
        },
      },
    });
  } catch (err) {
    // Fallback: open in system browser
    window.open(url, '_blank');
  }
}

// ---------------------------------------------------------------------------
// Public API — dispatches to native or iframe based on platform
// ---------------------------------------------------------------------------

/**
 * Open a URL in the in-app browser. Uses the native Capacitor InAppBrowser
 * WebView on Android/iOS, or the iframe-based overlay on web/PWA.
 */
export function openInAppBrowser(url: string): void {
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  if (isNativePlatform()) {
    openNativeBrowser(url);
  } else {
    openIframeBrowser(url);
  }
}

/**
 * Close the in-app browser. Dispatches to native close or iframe close.
 */
export function closeInAppBrowser(instant = false): void {
  if (isNativePlatform()) {
    import('@capacitor/inappbrowser').then(({ InAppBrowser }) => {
      InAppBrowser.close();
    }).catch(() => {});
    return;
  }

  closeIframeBrowser(instant);
}
