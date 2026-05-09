# Phase 0 Audit - Lighthouse runner for 15 sites
# Usage: powershell -File scripts\audit-lighthouse.ps1

$ErrorActionPreference = 'Continue'
$outDir = './lh-out'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sites = @(
  @{ slug = 'gmail';    url = 'https://gmail.com' }
  @{ slug = 'meet';     url = 'https://meet.google.com' }
  @{ slug = 'youtube';  url = 'https://www.youtube.com' }
  @{ slug = 'netflix';  url = 'https://www.netflix.com' }
  @{ slug = 'drive';    url = 'https://drive.google.com' }
  @{ slug = 'github';   url = 'https://github.com' }
  @{ slug = 'office';   url = 'https://www.office.com' }
  @{ slug = 'zoom';     url = 'https://zoom.us/wc' }
  @{ slug = 'slack';    url = 'https://app.slack.com' }
  @{ slug = 'x';        url = 'https://x.com' }
  @{ slug = 'ghana';    url = 'https://ghana.gov.gh' }
  @{ slug = 'ecobank';  url = 'https://ecobank.com' }
  @{ slug = 'nytimes';  url = 'https://www.nytimes.com' }
  @{ slug = 'whatsapp'; url = 'https://web.whatsapp.com' }
  @{ slug = 'webauthn'; url = 'https://webauthn.io' }
)

$total = $sites.Count
$i = 0

foreach ($s in $sites) {
  $i = $i + 1
  $slug = $s.slug
  $url = $s.url
  $jsonPath = Join-Path $outDir ($slug + '.json')

  Write-Host ''
  Write-Host ('[' + $i + '/' + $total + '] Lighthouse on ' + $slug + ' ...') -ForegroundColor Cyan

  $lhArgs = @(
    '--yes', 'lighthouse', $url,
    '--only-categories=performance',
    '--output=json',
    ('--output-path=' + $jsonPath),
    '--chrome-flags=--headless=new',
    '--quiet'
  )
  & npx @lhArgs
  if ($LASTEXITCODE -ne 0) {
    Write-Host ('  FAILED for ' + $slug + ' (exit ' + $LASTEXITCODE + ')') -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host '=== Lighthouse Summary (paste this back to Claude) ===' -ForegroundColor Green
Write-Host ''
Write-Host 'site         FCP      LCP      TTI      CLS      TBT'
Write-Host '----         ---      ---      ---      ---      ---'

foreach ($s in $sites) {
  $slug = $s.slug
  $jsonPath = Join-Path $outDir ($slug + '.json')

  if (-not (Test-Path $jsonPath)) {
    Write-Host ($slug.PadRight(12) + ' BLOCKED  BLOCKED  BLOCKED  -        -')
    continue
  }

  try {
    $lh = Get-Content $jsonPath -Raw | ConvertFrom-Json
    $a = $lh.audits
    $fcp = [int]$a.'first-contentful-paint'.numericValue
    $lcp = [int]$a.'largest-contentful-paint'.numericValue
    $tti = [int]$a.'interactive'.numericValue
    $cls = [math]::Round($a.'cumulative-layout-shift'.numericValue, 3)
    $tbt = [int]$a.'total-blocking-time'.numericValue

    $row = $slug.PadRight(12)
    $row = $row + ([string]$fcp).PadLeft(8)
    $row = $row + ([string]$lcp).PadLeft(9)
    $row = $row + ([string]$tti).PadLeft(9)
    $row = $row + ([string]$cls).PadLeft(9)
    $row = $row + ([string]$tbt).PadLeft(9)
    Write-Host $row
  } catch {
    Write-Host ($slug.PadRight(12) + ' PARSE_ERR -        -        -        -')
  }
}

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
