# Phase 3 - Launch a browser with debug port, capture a trace for a URL, stop browser.
# Usage: powershell -File scripts\audit-trace-launch.ps1 -Browser <osbrowser|chrome> -Url <url> -OutPath <path>

param(
  [Parameter(Mandatory=$true)][string]$Browser,
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$true)][string]$OutPath
)

$ErrorActionPreference = 'Continue'
if ($Browser -eq 'osbrowser') {
  $exe = './out/win-unpacked/OS Browser.exe'
  $port = 9223
  $profileDir = Join-Path $env:TEMP 'osb-trace-profile'
} elseif ($Browser -eq 'chrome') {
  $exe = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
  $port = 9224
  $profileDir = Join-Path $env:TEMP 'chrome-trace-profile'
} else {
  Write-Host 'Browser must be osbrowser or chrome' -ForegroundColor Red
  exit 1
}

if (Test-Path $profileDir) { Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue }

Write-Host ('Launching ' + $Browser + ' (port ' + $port + ')...')
$proc = Start-Process -FilePath $exe `
  -ArgumentList ('--remote-debugging-port=' + $port), ('--user-data-dir=' + $profileDir), '--no-first-run', '--no-default-browser-check' `
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
  Write-Host ('Failed to connect to ' + $Browser + ' at port ' + $port) -ForegroundColor Red
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  exit 1
}

$env:CDP_PORT_OVERRIDE = $port
node scripts/audit-trace.js $Url $OutPath
$exitCode = $LASTEXITCODE
Remove-Item Env:\CDP_PORT_OVERRIDE -ErrorAction SilentlyContinue

if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
Get-Process | Where-Object { $_.Path -eq (Resolve-Path $exe).Path } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force } catch {}
}

exit $exitCode
