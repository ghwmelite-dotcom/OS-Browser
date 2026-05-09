# Phase 1 - Launch OS Browser with remote debugging, run ad-blocker audit, stop browser

$ErrorActionPreference = 'Continue'
$port = 9223
$exe = './out/win-unpacked/OS Browser.exe'
$profileDir = Join-Path $env:TEMP 'os-browser-adblock-audit'

if (-not (Test-Path $exe)) {
  Write-Host 'OS Browser binary not found' -ForegroundColor Red
  exit 1
}

if (Test-Path $profileDir) {
  Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue
}

Write-Host 'Launching OS Browser with remote debugging on port 9223...' -ForegroundColor Cyan
$proc = Start-Process -FilePath $exe `
  -ArgumentList ('--remote-debugging-port=' + $port), ('--user-data-dir=' + $profileDir) `
  -PassThru

Start-Sleep -Seconds 5
$ready = $false
for ($i = 1; $i -le 12; $i++) {
  try {
    $version = Invoke-RestMethod -Uri ('http://localhost:' + $port + '/json/version') -ErrorAction Stop
    Write-Host ('Connected. Browser: ' + $version.Browser) -ForegroundColor Green
    $ready = $true
    break
  } catch { Start-Sleep -Seconds 2 }
}

if (-not $ready) {
  Write-Host 'ERROR: Could not connect.' -ForegroundColor Red
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  exit 1
}

Write-Host 'Running ad-blocker audit...' -ForegroundColor Cyan
node scripts/audit-adblocker.js

Write-Host 'Stopping OS Browser...' -ForegroundColor Cyan
if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
Get-Process | Where-Object { $_.Path -eq (Resolve-Path $exe).Path } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force } catch {}
}
Write-Host 'Done.' -ForegroundColor Green
