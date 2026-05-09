// Phase 0 Audit - Drive OS Browser via Chrome DevTools Protocol
// Captures FCP, LCP, console errors per site by reusing the existing tab.

const CDP = require('chrome-remote-interface');
const fs = require('fs');

const PORT = parseInt(process.env.CDP_PORT_OVERRIDE || '9223', 10);
const PER_SITE_TIMEOUT_MS = 60000;       // slow 4G needs more headroom
const POST_LOAD_SETTLE_MS = 5000;        // wait for LCP to settle after load event

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

async function evalJs(client, expression) {
  const result = await client.Runtime.evaluate({ expression, returnByValue: true });
  return result.result.value;
}

async function measureSite(client, url) {
  const errors = [];
  const errorListener = ({ exceptionDetails }) => {
    errors.push('exc: ' + (exceptionDetails.text || exceptionDetails.exception?.description || 'unknown'));
  };
  const consoleListener = ({ entry }) => {
    if (entry?.level === 'error') {
      errors.push('cerr: ' + entry.text.substring(0, 200));
    }
  };

  client.Runtime.exceptionThrown(errorListener);
  client.Log.entryAdded(consoleListener);

  // Reset perf entries by injecting before navigation? No, simpler: navigate erases context.
  await client.Page.navigate({ url });

  // Wait for load event with timeout
  const loadPromise = client.Page.loadEventFired();
  const timeoutResult = await Promise.race([
    loadPromise.then(() => 'loaded'),
    sleep(PER_SITE_TIMEOUT_MS).then(() => 'timeout')
  ]);

  if (timeoutResult === 'timeout') {
    return { fcp: null, lcp: null, errors: errors.slice(0, 5), title: null, status: 'TIMEOUT' };
  }

  // Wait for LCP to settle
  await sleep(POST_LOAD_SETTLE_MS);

  let fcp, lcp, title;
  try {
    fcp = await evalJs(client, `
      (() => {
        try {
          const entries = performance.getEntriesByType('paint');
          const fcp = entries.find(e => e.name === 'first-contentful-paint');
          return fcp ? Math.round(fcp.startTime) : null;
        } catch (e) { return null; }
      })()
    `);
    lcp = await evalJs(client, `
      (() => {
        try {
          const arr = window.__lcpEntries || [];
          const last = arr[arr.length - 1];
          return last ? Math.round(last.startTime) : null;
        } catch (e) { return null; }
      })()
    `);
    title = await evalJs(client, `document.title || ''`);
  } catch (err) {
    return { fcp: null, lcp: null, errors: errors.slice(0, 5), title: null, status: 'EVAL_FAIL: ' + err.message };
  }

  return {
    fcp,
    lcp,
    errors: errors.slice(0, 5),
    title: (title || '').substring(0, 60),
    status: 'OK'
  };
}

async function main() {
  let targets;
  try {
    targets = await CDP.List({ port: PORT });
  } catch (err) {
    console.error('Cannot connect to OS Browser at port ' + PORT + ': ' + err.message);
    process.exit(1);
  }

  const target = targets.find(t => t.type === 'page');
  if (!target) {
    console.error('No page target found in browser');
    process.exit(1);
  }

  console.log('Connecting to target: ' + target.title + ' (' + target.url + ')');

  const client = await CDP({ port: PORT, target });
  await client.Page.enable();
  await client.Runtime.enable();
  await client.Log.enable();
  await client.Network.enable();

  // Throttle to match Lighthouse default (slow 4G + 4x CPU)
  await client.Network.emulateNetworkConditions({
    offline: false,
    latency: 150,
    downloadThroughput: (1.5 * 1024 * 1024) / 8,  // 1.5 Mbps in bytes/sec
    uploadThroughput: (0.75 * 1024 * 1024) / 8
  });
  await client.Emulation.setCPUThrottlingRate({ rate: 4 });
  console.log('Throttling applied: slow 4G network + 4x CPU');

  // Inject LCP observer that buffers entries to window.__lcpEntries on every new doc
  await client.Page.addScriptToEvaluateOnNewDocument({
    source: `
      (function() {
        try {
          window.__lcpEntries = [];
          const obs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__lcpEntries.push({ startTime: entry.startTime, size: entry.size });
            }
          });
          obs.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) { /* swallow */ }
      })();
    `
  });

  const results = [];
  for (let i = 0; i < SITES.length; i++) {
    const s = SITES[i];
    process.stdout.write('[' + (i + 1) + '/' + SITES.length + '] ' + s.slug.padEnd(10) + ' ');
    let r;
    try {
      r = await measureSite(client, s.url);
    } catch (err) {
      r = { fcp: null, lcp: null, errors: ['fatal: ' + err.message], title: null, status: 'CRASH' };
    }
    results.push({ ...s, ...r });
    const fcpStr = r.fcp != null ? r.fcp + 'ms' : 'n/a';
    const lcpStr = r.lcp != null ? r.lcp + 'ms' : 'n/a';
    console.log('FCP=' + fcpStr + ' LCP=' + lcpStr + ' errors=' + r.errors.length + ' [' + r.status + ']');
  }

  await client.close();

  console.log('');
  console.log('=== OS Browser CDP Summary (paste this back to Claude) ===');
  console.log('');
  console.log('site         FCP      LCP      Err  Status     Title');
  console.log('----         ---      ---      ---  ------     -----');
  for (const r of results) {
    const fcp = r.fcp != null ? String(r.fcp).padStart(8) : '     n/a';
    const lcp = r.lcp != null ? String(r.lcp).padStart(9) : '      n/a';
    const errs = String((r.errors || []).length).padStart(4);
    const status = (r.status || '').padEnd(10);
    const title = (r.title || '').substring(0, 30);
    console.log(r.slug.padEnd(12) + fcp + lcp + errs + '  ' + status + ' ' + title);
  }

  console.log('');
  console.log('Detailed errors per site:');
  for (const r of results) {
    if ((r.errors || []).length > 0) {
      console.log('  ' + r.slug + ':');
      for (const e of r.errors) {
        console.log('    - ' + e);
      }
    }
  }

  fs.writeFileSync('./osbrowser-cdp-results.json', JSON.stringify(results, null, 2));
  console.log('');
  console.log('Full results saved to ./osbrowser-cdp-results.json');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
