# Phase 0 Audit - Memory sampling during 15-site sequential audit for both browsers
# Outputs an RSS curve per browser (sample every 3s) so we can compute baseline / peak / avg / end.

$ErrorActionPreference = 'Continue'

function Sample-BrowserRss {
  param([string]$BrowserExePath, [string]$LogPath, [int]$IntervalSec = 3)

  $resolvedExe = (Resolve-Path $BrowserExePath).Path
  # Convert log path to absolute (Start-Job may have different working dir)
  $absLogPath = if ([System.IO.Path]::IsPathRooted($LogPath)) { $LogPath } else {
    Join-Path (Get-Location).Path $LogPath
  }
  # Pre-create the file so we can verify writes even if sampler dies
  'timestamp_s,rss_mb' | Out-File -FilePath $absLogPath -Encoding utf8

  $job = Start-Job -ScriptBlock {
    param($exePath, $logPath, $interval)
    $start = Get-Date
    while ($true) {
      try {
        $now = Get-Date
        $elapsed = [math]::Round(($now - $start).TotalSeconds, 1)
        $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exePath }
        if ($procs) {
          $totalMB = [math]::Round((($procs | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB), 1)
        } else {
          $totalMB = 0
        }
        Add-Content -Path $logPath -Value ('{0},{1}' -f $elapsed, $totalMB) -Encoding utf8
      } catch {
        Add-Content -Path $logPath -Value ('# error: ' + $_.Exception.Message) -Encoding utf8
      }
      Start-Sleep -Seconds $interval
    }
  } -ArgumentList $resolvedExe, $absLogPath, $IntervalSec
  return $job
}

function Stop-RssSampler {
  param($Job)
  Stop-Job $Job -ErrorAction SilentlyContinue
  Remove-Job $Job -Force -ErrorAction SilentlyContinue
}

function Summarize-Rss {
  param([string]$LogPath, [string]$Label)
  if (-not (Test-Path $LogPath)) { return $null }
  $rows = Import-Csv $LogPath
  if ($rows.Count -lt 2) { return $null }
  $values = $rows | ForEach-Object { [double]$_.rss_mb } | Where-Object { $_ -gt 0 }
  if ($values.Count -eq 0) { return $null }

  $baseline = $values[0]
  $peak = ($values | Measure-Object -Maximum).Maximum
  $avg = [math]::Round((($values | Measure-Object -Average).Average), 1)
  $end = $values[-1]
  $duration = [double]($rows[-1].timestamp_s)

  $third = [math]::Floor($values.Count / 3)
  $twothird = [math]::Floor(2 * $values.Count / 3)
  $rssAtThird = if ($third -lt $values.Count) { $values[$third] } else { 0 }
  $rssAt2Third = if ($twothird -lt $values.Count) { $values[$twothird] } else { 0 }

  return @{
    Label = $Label
    Baseline = $baseline
    AtThird = $rssAtThird
    At2Third = $rssAt2Third
    End = $end
    Peak = $peak
    Avg = $avg
    Samples = $values.Count
    DurationSec = $duration
  }
}

# === OS Browser run ===
$osbExe = './out/win-unpacked/OS Browser.exe'
$osbProfile = Join-Path $env:TEMP 'os-browser-mem-audit'
$osbLog = './osb-rss.csv'
$osbPort = 9223

if (Test-Path $osbProfile) { Remove-Item -Recurse -Force $osbProfile -ErrorAction SilentlyContinue }
if (Test-Path $osbLog) { Remove-Item $osbLog -ErrorAction SilentlyContinue }

Write-Host '=== OS Browser memory audit ===' -ForegroundColor Cyan
Write-Host 'Launching OS Browser...'
$osbProc = Start-Process -FilePath $osbExe `
  -ArgumentList ('--remote-debugging-port=' + $osbPort), ('--user-data-dir=' + $osbProfile) `
  -PassThru

Start-Sleep -Seconds 5
$ready = $false
for ($i = 1; $i -le 10; $i++) {
  try {
    $null = Invoke-RestMethod -Uri ('http://localhost:' + $osbPort + '/json/version') -ErrorAction Stop
    $ready = $true
    break
  } catch { Start-Sleep -Seconds 2 }
}
if (-not $ready) {
  Write-Host 'OS Browser failed to come up' -ForegroundColor Red
  if ($osbProc -and -not $osbProc.HasExited) { Stop-Process -Id $osbProc.Id -Force }
  exit 1
}

Write-Host 'Starting RSS sampler (3s interval)...'
$osbJob = Sample-BrowserRss -BrowserExePath $osbExe -LogPath $osbLog -IntervalSec 3

Write-Host 'Running CDP audit...'
node scripts/audit-osbrowser-cdp.js | Out-Null

Write-Host 'Stopping sampler and OS Browser...'
Stop-RssSampler -Job $osbJob
if ($osbProc -and -not $osbProc.HasExited) { Stop-Process -Id $osbProc.Id -Force }
Get-Process | Where-Object { $_.Path -eq (Resolve-Path $osbExe).Path } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force } catch {}
}

Start-Sleep -Seconds 3

# === Chrome run ===
$chromeExe = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$chromeProfile = Join-Path $env:TEMP 'chrome-mem-audit'
$chromeLog = './chrome-rss.csv'
$chromePort = 9224

if (Test-Path $chromeProfile) { Remove-Item -Recurse -Force $chromeProfile -ErrorAction SilentlyContinue }
if (Test-Path $chromeLog) { Remove-Item $chromeLog -ErrorAction SilentlyContinue }

Write-Host ''
Write-Host '=== Chrome memory audit ===' -ForegroundColor Cyan
Write-Host 'Launching Chrome (headed, isolated profile)...'
$chromeProc = Start-Process -FilePath $chromeExe `
  -ArgumentList ('--remote-debugging-port=' + $chromePort), ('--user-data-dir=' + $chromeProfile), '--no-first-run', '--no-default-browser-check' `
  -PassThru

Start-Sleep -Seconds 5
$ready = $false
for ($i = 1; $i -le 10; $i++) {
  try {
    $null = Invoke-RestMethod -Uri ('http://localhost:' + $chromePort + '/json/version') -ErrorAction Stop
    $ready = $true
    break
  } catch { Start-Sleep -Seconds 2 }
}
if (-not $ready) {
  Write-Host 'Chrome failed to come up' -ForegroundColor Red
  if ($chromeProc -and -not $chromeProc.HasExited) { Stop-Process -Id $chromeProc.Id -Force }
  exit 1
}

Write-Host 'Starting RSS sampler (3s interval)...'
$chromeJob = Sample-BrowserRss -BrowserExePath $chromeExe -LogPath $chromeLog -IntervalSec 3

Write-Host 'Running CDP audit against Chrome on port 9224...'
$env:CDP_PORT_OVERRIDE = '9224'
node scripts/audit-osbrowser-cdp.js | Out-Null
Remove-Item Env:\CDP_PORT_OVERRIDE -ErrorAction SilentlyContinue

Write-Host 'Stopping sampler and Chrome...'
Stop-RssSampler -Job $chromeJob
if ($chromeProc -and -not $chromeProc.HasExited) { Stop-Process -Id $chromeProc.Id -Force }
Get-Process | Where-Object { $_.Path -eq (Resolve-Path $chromeExe).Path } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force } catch {}
}

# === Summary ===
Write-Host ''
Write-Host '=== Memory Summary (paste this back to Claude) ===' -ForegroundColor Green
Write-Host ''

$osbSummary = Summarize-Rss -LogPath $osbLog -Label 'OS Browser'
$chromeSummary = Summarize-Rss -LogPath $chromeLog -Label 'Chrome'

Write-Host 'Memory growth across 15-site sequential navigation (1 tab):'
Write-Host ''
Write-Host 'browser      baseline  ~5sites  ~10sites  end-RSS  peak-RSS  avg-RSS  samples'
Write-Host '-------      --------  -------  --------  -------  --------  -------  -------'

foreach ($s in @($osbSummary, $chromeSummary)) {
  if ($null -eq $s) { continue }
  $row = $s.Label.PadRight(13)
  $row = $row + ([string]$s.Baseline).PadLeft(8) + 'MB'
  $row = $row + ([string]$s.AtThird).PadLeft(8) + 'MB'
  $row = $row + ([string]$s.At2Third).PadLeft(9) + 'MB'
  $row = $row + ([string]$s.End).PadLeft(8) + 'MB'
  $row = $row + ([string]$s.Peak).PadLeft(9) + 'MB'
  $row = $row + ([string]$s.Avg).PadLeft(8) + 'MB'
  $row = $row + ([string]$s.Samples).PadLeft(9)
  Write-Host $row
}

Write-Host ''
Write-Host 'Done. CSVs: ./osb-rss.csv and ./chrome-rss.csv' -ForegroundColor Green
