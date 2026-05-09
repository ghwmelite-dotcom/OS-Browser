// Phase 1 Task 6 - YouTube HTTP 403 capture and categorisation
// Navigates to YouTube and logs every response with status 403, with full URL + initiator.

const CDP = require('chrome-remote-interface');
const fs = require('fs');

const PORT = parseInt(process.env.CDP_PORT_OVERRIDE || '9223', 10);

async function main() {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find(t => t.type === 'page');
  const client = await CDP({ port: PORT, target });

  await client.Page.enable();
  await client.Network.enable();

  const results403 = [];
  const allResponses = [];

  client.Network.responseReceived(({ response, type }) => {
    allResponses.push({ url: response.url, status: response.status, type });
    if (response.status === 403) {
      results403.push({
        url: response.url,
        type,
        mimeType: response.mimeType,
        headers: response.headers
      });
    }
  });

  console.log('Navigating to https://www.youtube.com ...');
  await client.Page.navigate({ url: 'https://www.youtube.com' });

  await Promise.race([
    client.Page.loadEventFired(),
    new Promise(r => setTimeout(r, 30000))
  ]);

  await new Promise(r => setTimeout(r, 5000)); // settle

  await client.close();

  console.log('');
  console.log('Total responses captured: ' + allResponses.length);
  console.log('Responses with status 403: ' + results403.length);
  console.log('');

  if (results403.length === 0) {
    console.log('No 403 responses found.');
    return;
  }

  // Group by host
  const byHost = {};
  for (const r of results403) {
    try {
      const h = new URL(r.url).hostname;
      if (!byHost[h]) byHost[h] = [];
      byHost[h].push(r);
    } catch {
      if (!byHost['(invalid)']) byHost['(invalid)'] = [];
      byHost['(invalid)'].push(r);
    }
  }

  console.log('=== 403 by host ===');
  for (const host of Object.keys(byHost).sort()) {
    const arr = byHost[host];
    console.log('  ' + host + ' — ' + arr.length + ' x 403');
  }

  console.log('');
  console.log('=== Full URL list ===');
  for (const r of results403) {
    console.log('  [' + r.type + '] ' + r.url);
  }

  // Categorise
  const trackerHosts = /googletagmanager|doubleclick|googlesyndication|googleads|scorecardresearch|adservice|admob|moatads/i;
  let trackerCount = 0;
  let youtubeContent = 0;
  let other = 0;
  const youtubeContentUrls = [];
  const otherUrls = [];

  for (const r of results403) {
    try {
      const h = new URL(r.url).hostname;
      if (trackerHosts.test(h)) {
        trackerCount++;
      } else if (/youtube\.com|googlevideo\.com|ytimg\.com/.test(h)) {
        youtubeContent++;
        youtubeContentUrls.push(r.url);
      } else {
        other++;
        otherUrls.push(r.url);
      }
    } catch { other++; }
  }

  console.log('');
  console.log('=== Categorisation ===');
  console.log('  Tracker domains (expected to fail): ' + trackerCount);
  console.log('  YouTube content/API (NOT expected to fail): ' + youtubeContent);
  console.log('  Other: ' + other);

  if (youtubeContent > 0) {
    console.log('');
    console.log('⚠️  YouTube content/API URLs returning 403 — REAL ISSUE:');
    for (const u of youtubeContentUrls) {
      console.log('  ' + u);
    }
  }

  fs.writeFileSync('./youtube-403-results.json', JSON.stringify({
    total: results403.length,
    byHost,
    trackerCount,
    youtubeContent,
    other,
    youtubeContentUrls,
    otherUrls,
    full: results403
  }, null, 2));
  console.log('');
  console.log('Saved: ./youtube-403-results.json');
}

main().catch(err => { console.error(err); process.exit(1); });
