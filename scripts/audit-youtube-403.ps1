# Phase 1 Task 6 - Launch OS Browser and run YouTube 403 capture

$ErrorActionPreference = 'Continue'
$port = 9223
$exe = './out/win-unpacked/OS Browser.exe'
$profileDir = Join-Path $env:TEMP 'os-browser-yt-audit'

if (Test-Path $profileDir) { Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue }

$proc = Start-Process -FilePath $exe `
  -ArgumentList ('--remote-debugging-port=' + $port), ('--user-data-dir=' + $profileDir) `
  -PassThru

Start-Sleep -Seconds 5
$ready = $false
for ($i = 1; $i -le 12; $i++) {
  try {
    $null = Invoke-RestMethod -Uri ('http://localhost:' + $port + '/json/version') -ErrorAction Stop
    $ready = $true
    break
  } catch { Start-Sleep -Seconds 2 }
}

if (-not $ready) {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  exit 1
}

Write-Host 'Running YouTube 403 capture...' -ForegroundColor Cyan
node scripts/audit-youtube-403.js

if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
Get-Process | Where-Object { $_.Path -eq (Resolve-Path $exe).Path } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force } catch {}
}
