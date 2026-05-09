// Phase 3 - Capture DevTools Performance trace via CDP for a single URL.
// Usage: node scripts/audit-trace.js <url> <output-path> [throttle=1]

const CDP = require('chrome-remote-interface');
const fs = require('fs');

const PORT = parseInt(process.env.CDP_PORT_OVERRIDE || '9223', 10);
const url = process.argv[2];
const outPath = process.argv[3];
const throttle = process.argv[4] !== '0';

if (!url || !outPath) {
  console.error('Usage: node audit-trace.js <url> <output.json> [throttle=1|0]');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // Retry target discovery — OS Browser sometimes takes a few seconds to register its first page target
  let target = null;
  for (let i = 0; i < 8; i++) {
    const targets = await CDP.List({ port: PORT });
    target = targets.find(t => t.type === 'page');
    if (target) break;
    if (i === 0) console.log('Waiting for page target...');
    await sleep(2000);
  }
  if (!target) {
    console.error('No page target after 16s');
    process.exit(1);
  }

  const client = await CDP({ port: PORT, target });
  await client.Page.enable();
  await client.Network.enable();

  if (throttle) {
    await client.Network.emulateNetworkConditions({
      offline: false,
      latency: 150,
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (0.75 * 1024 * 1024) / 8
    });
    await client.Emulation.setCPUThrottlingRate({ rate: 4 });
    console.log('Throttling: slow 4G + 4x CPU');
  }

  const chunks = [];
  client.Tracing.dataCollected(({ value }) => { chunks.push(...value); });
  const completePromise = new Promise(resolve => {
    client.Tracing.tracingComplete(() => resolve());
  });

  await client.Tracing.start({
    categories: 'blink.user_timing,loading,devtools.timeline,toplevel,disabled-by-default-devtools.timeline',
    options: 'sampling-frequency=10000'
  });

  console.log('Tracing started. Navigating to ' + url + ' ...');
  await client.Page.navigate({ url });

  try {
    await Promise.race([
      client.Page.loadEventFired(),
      sleep(60000)
    ]);
  } catch {}
  await sleep(5000);

  console.log('Stopping trace...');
  await client.Tracing.end();
  await completePromise;

  fs.writeFileSync(outPath, JSON.stringify({ traceEvents: chunks }, null, 0));
  console.log('Saved ' + chunks.length + ' events to ' + outPath);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
