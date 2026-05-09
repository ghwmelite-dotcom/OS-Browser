// Phase 1 - Ad-blocker first-party audit
// Captures EVERY blocked URL (not capped) per site via Network domain.

const CDP = require('chrome-remote-interface');
const fs = require('fs');

const PORT = parseInt(process.env.CDP_PORT_OVERRIDE || '9223', 10);
const PER_SITE_TIMEOUT_MS = 30000;
const POST_LOAD_SETTLE_MS = 3000;

const SITES = [
  { slug: 'gmail',    url: 'https://gmail.com' },
  { slug: 'meet',     url: 'https://meet.google.com' },
  { slug: 'youtube',  url: 'https://www.youtube.com' },
  { slug: 'netflix',  url: 'https://www.netflix.com' },
  { slug: 'drive',    url: 'https://drive.google.com' },
  { slug: 'github',   url: 'https://github.com' },
  { slug: 'office',   url: 'https://www.office.com' },
  { slug: 'zoom',     url: 'https://zoom.us/wc' },
  { slug: 'slack',    url: 'https://app.slack.com' },
  { slug: 'x',        url: 'https://x.com' },
  { slug: 'ghana',    url: 'https://ghana.gov.gh' },
  { slug: 'ecobank',  url: 'https://ecobank.com' },
  { slug: 'nytimes',  url: 'https://www.nytimes.com' },
  { slug: 'whatsapp', url: 'https://web.whatsapp.com' },
  { slug: 'webauthn', url: 'https://webauthn.io' }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function eTLDPlus1(hostname) {
  // Simple eTLD+1 heuristic. For IPs and unusual TLDs this returns the host itself.
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  const last2 = parts.slice(-2).join('.');
  // Special case for *.co.uk / *.com.gh / *.gov.gh etc.
  const compoundSuffixes = ['co.uk', 'com.gh', 'gov.gh', 'co.za', 'com.ng', 'co.ke', 'ac.uk'];
  if (compoundSuffixes.includes(last2) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return last2;
}

async function main() {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find(t => t.type === 'page');
  if (!target) {
    console.error('No page target found');
    process.exit(1);
  }
  console.log('Connected to: ' + target.title);

  const client = await CDP({ port: PORT, target });
  await client.Page.enable();
  await client.Network.enable();

  // State per-site
  let currentSite = null;
  const pendingRequests = new Map(); // requestId -> { url, type }
  const results = {}; // slug -> [ { url, type, errorText, blockedReason } ]

  client.Network.requestWillBeSent(({ requestId, request, type }) => {
    pendingRequests.set(requestId, { url: request.url, type });
  });

  client.Network.loadingFailed(({ requestId, errorText, blockedReason, type }) => {
    if (!currentSite) return;
    const req = pendingRequests.get(requestId);
    if (!req) return;
    const isBlocked = (errorText && errorText.includes('BLOCKED_BY_CLIENT')) || blockedReason;
    if (!isBlocked) return;
    if (!results[currentSite]) results[currentSite] = [];
    results[currentSite].push({
      url: req.url,
      type: type || req.type || '',
      errorText: errorText || '',
      blockedReason: blockedReason || ''
    });
  });

  // Run navigations
  for (let i = 0; i < SITES.length; i++) {
    const s = SITES[i];
    currentSite = s.slug;
    pendingRequests.clear();
    process.stdout.write('[' + (i + 1) + '/' + SITES.length + '] ' + s.slug.padEnd(10));

    try {
      await client.Page.navigate({ url: s.url });
      await Promise.race([
        client.Page.loadEventFired(),
        sleep(PER_SITE_TIMEOUT_MS)
      ]);
      await sleep(POST_LOAD_SETTLE_MS);
    } catch (err) {
      console.log(' nav-error: ' + err.message);
      continue;
    }

    const count = (results[s.slug] || []).length;
    console.log(' blocked=' + count);
  }

  await client.close();

  // Classify
  console.log('');
  console.log('=== Ad-blocker classification ===');
  console.log('');

  const summary = {};
  for (const s of SITES) {
    const blocked = results[s.slug] || [];
    const siteHost = new URL(s.url).hostname;
    const siteEtld = eTLDPlus1(siteHost);

    let firstParty = 0;
    let trackerLike = 0;
    let cdnLike = 0;
    let other = 0;
    const firstPartyUrls = [];

    for (const item of blocked) {
      try {
        const u = new URL(item.url);
        const itemEtld = eTLDPlus1(u.hostname);

        if (itemEtld === siteEtld) {
          firstParty++;
          firstPartyUrls.push(item.url);
        } else if (/google.*analytics|doubleclick|googletagmanager|googlesyndication|scorecardresearch|hotjar|segment\.io|mixpanel|adsystem|adservice|criteo|adnxs|moatads|amazon-adsystem|googleads/i.test(u.hostname)) {
          trackerLike++;
        } else if (/cdn|jsdelivr|cloudflare|akamaized|amazonaws|cloudfront|googleapis/i.test(u.hostname)) {
          cdnLike++;
        } else {
          other++;
        }
      } catch {
        other++;
      }
    }

    summary[s.slug] = {
      total: blocked.length,
      firstParty,
      trackerLike,
      cdnLike,
      other,
      firstPartyUrls
    };

    const flag = firstParty > 0 ? ' ⚠️  REVIEW' : '';
    console.log(s.slug.padEnd(12) + ' total=' + String(blocked.length).padStart(3) +
      ' first-party=' + String(firstParty).padStart(2) +
      ' trackers=' + String(trackerLike).padStart(3) +
      ' cdn=' + String(cdnLike).padStart(2) +
      ' other=' + String(other).padStart(3) + flag);
  }

  console.log('');
  console.log('=== First-party blocked URLs (potential over-blocks) ===');
  console.log('');
  let anyFirstParty = false;
  for (const slug of Object.keys(summary)) {
    const s = summary[slug];
    if (s.firstParty > 0) {
      anyFirstParty = true;
      console.log(slug + ':');
      for (const url of s.firstPartyUrls.slice(0, 10)) {
        console.log('  ' + url);
      }
      if (s.firstPartyUrls.length > 10) {
        console.log('  ... and ' + (s.firstPartyUrls.length - 10) + ' more');
      }
    }
  }
  if (!anyFirstParty) {
    console.log('  (none — ad blocker is not over-blocking first-party resources)');
  }

  fs.writeFileSync('./adblock-blocked-urls.json', JSON.stringify({ summary, results }, null, 2));
  console.log('');
  console.log('Saved: ./adblock-blocked-urls.json');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
