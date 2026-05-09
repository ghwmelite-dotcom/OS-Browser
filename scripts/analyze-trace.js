// Phase 3 Task 4 - Programmatic trace analysis
// Usage: node scripts/analyze-trace.js <trace.json>
// Output: LCP, Long Tasks, top scripts by CPU time

const fs = require('fs');

const tracePath = process.argv[2];
if (!tracePath) { console.error('Usage: node analyze-trace.js <trace.json>'); process.exit(1); }

console.log('Loading trace: ' + tracePath);
const raw = fs.readFileSync(tracePath, 'utf8');
const data = JSON.parse(raw);
const events = Array.isArray(data) ? data : data.traceEvents;
console.log('Total events: ' + events.length);

// Helpers
function fmtMs(us) { return (us / 1000).toFixed(1) + 'ms'; }
function shortUrl(u, max = 80) {
  if (!u) return '';
  if (u.length <= max) return u;
  const head = u.substring(0, 50);
  const tail = u.substring(u.length - 25);
  return head + '...' + tail;
}

// 1) Find navigation start (the earliest navigationStart mark)
let navStartUs = Infinity;
for (const e of events) {
  if (e.name === 'navigationStart') {
    if (e.ts < navStartUs) navStartUs = e.ts;
  }
}
if (navStartUs === Infinity) {
  // Fallback: earliest timestamp
  for (const e of events) {
    if (typeof e.ts === 'number' && e.ts < navStartUs) navStartUs = e.ts;
  }
}
console.log('navigationStart: ' + navStartUs + 'us');

// 2) Find LCP candidates (last one before page unload is the actual LCP)
const lcpCandidates = events.filter(e =>
  e.name === 'largestContentfulPaint::Candidate' ||
  e.name === 'LargestContentfulPaint' ||
  e.name === 'largestContentfulPaint::NoCandidate'
);
let lcpTs = null;
let lcpInfo = null;
for (const e of lcpCandidates) {
  if (e.name !== 'largestContentfulPaint::NoCandidate') {
    lcpTs = e.ts;
    lcpInfo = e;
  }
}
const lcpRelMs = lcpTs ? (lcpTs - navStartUs) / 1000 : null;
console.log('');
console.log('LCP: ' + (lcpRelMs ? lcpRelMs.toFixed(0) + 'ms' : 'not found') + ' (' + lcpCandidates.length + ' candidates)');

// 3) FCP (firstContentfulPaint event)
const fcpEvent = events.find(e => e.name === 'firstContentfulPaint');
const fcpRelMs = fcpEvent ? (fcpEvent.ts - navStartUs) / 1000 : null;
console.log('FCP: ' + (fcpRelMs ? fcpRelMs.toFixed(0) + 'ms' : 'not found'));

// 4) Long Tasks (cat=devtools.timeline name=RunTask dur>50ms)
const longTasks = events.filter(e =>
  e.ph === 'X' &&
  e.dur >= 50000 &&
  (e.name === 'RunTask' || e.name === 'EvaluateScript' || e.name === 'v8.run' || e.name === 'FunctionCall')
);
const totalLongTaskBeforeLCPus = longTasks
  .filter(e => !lcpTs || e.ts < lcpTs)
  .reduce((s, e) => s + e.dur, 0);
console.log('');
console.log('Long Tasks (>=50ms): ' + longTasks.length);
console.log('Total Long Task time before LCP: ' + (totalLongTaskBeforeLCPus / 1000).toFixed(0) + 'ms');

// 5) Top long tasks by duration
const topLongTasks = longTasks
  .sort((a, b) => b.dur - a.dur)
  .slice(0, 10);
console.log('');
console.log('=== Top 10 longest tasks ===');
for (const t of topLongTasks) {
  const startRel = (t.ts - navStartUs) / 1000;
  const url = (t.args && (t.args.data?.url || t.args.url)) || (t.args?.fileName) || '';
  console.log('  ' + (t.dur / 1000).toFixed(0).padStart(5) + 'ms @ ' + startRel.toFixed(0).padStart(5) + 'ms  ' + (t.name || 'unnamed').padEnd(20) + ' ' + shortUrl(url, 70));
}

// 6) Script execution by URL/source — sum durations
const scriptCpuByUrl = new Map();
for (const e of events) {
  if (e.ph !== 'X' || !e.dur) continue;
  if (e.name !== 'EvaluateScript' && e.name !== 'v8.compile' && e.name !== 'FunctionCall') continue;
  const url = (e.args && (e.args.data?.url || e.args.url || e.args.fileName)) || '(unknown)';
  if (!scriptCpuByUrl.has(url)) scriptCpuByUrl.set(url, 0);
  scriptCpuByUrl.set(url, scriptCpuByUrl.get(url) + e.dur);
}
const topScripts = [...scriptCpuByUrl.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
console.log('');
console.log('=== Top 15 scripts by total CPU time ===');
for (const [url, durUs] of topScripts) {
  console.log('  ' + (durUs / 1000).toFixed(0).padStart(6) + 'ms  ' + shortUrl(url, 110));
}

// 7) Resource timing — pull HTTPRequest events to find slowest critical resources
const requests = events.filter(e =>
  e.name === 'ResourceSendRequest' ||
  e.name === 'ResourceFinish' ||
  e.name === 'ResourceReceiveResponse'
);
console.log('');
console.log('Total resource events: ' + requests.length);

// 8) Layout/Style/Paint cost
let layoutMs = 0, styleMs = 0, paintMs = 0;
for (const e of events) {
  if (e.ph !== 'X' || !e.dur) continue;
  if (e.name === 'Layout' || e.name === 'UpdateLayoutTree') layoutMs += e.dur;
  else if (e.name === 'ParseAuthorStyleSheet' || e.name === 'UpdateLayoutTree') styleMs += e.dur;
  else if (e.name === 'Paint' || e.name === 'PrePaint' || e.name === 'CompositeLayers') paintMs += e.dur;
}
console.log('');
console.log('Render cost (cumulative across all threads):');
console.log('  Layout: ' + (layoutMs / 1000).toFixed(0) + 'ms');
console.log('  Style:  ' + (styleMs / 1000).toFixed(0) + 'ms');
console.log('  Paint:  ' + (paintMs / 1000).toFixed(0) + 'ms');

// 9) Output JSON summary for downstream diffing
const summary = {
  trace: tracePath,
  navStartUs,
  fcpMs: fcpRelMs,
  lcpMs: lcpRelMs,
  longTaskCount: longTasks.length,
  longTaskTotalBeforeLCPms: totalLongTaskBeforeLCPus / 1000,
  topLongTasks: topLongTasks.map(t => ({
    name: t.name,
    durMs: t.dur / 1000,
    startRelMs: (t.ts - navStartUs) / 1000,
    url: (t.args?.data?.url) || ''
  })),
  topScripts: topScripts.map(([url, dur]) => ({ url, totalMs: dur / 1000 })),
  layoutMs: layoutMs / 1000,
  styleMs: styleMs / 1000,
  paintMs: paintMs / 1000
};
const summaryPath = tracePath.replace(/\.json$/, '-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log('');
console.log('Summary saved: ' + summaryPath);
