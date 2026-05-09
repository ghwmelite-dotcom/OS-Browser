# Phase 3 Tasks 2-3 - Capture all 4 traces sequentially: slack/youtube × osbrowser/chrome

$ErrorActionPreference = 'Continue'

$captures = @(
  @{ browser = 'osbrowser'; url = 'https://app.slack.com';     out = '.\traces\slack-osbrowser.json' }
  @{ browser = 'osbrowser'; url = 'https://www.youtube.com';   out = '.\traces\youtube-osbrowser.json' }
  @{ browser = 'chrome';    url = 'https://app.slack.com';     out = '.\traces\slack-chrome.json' }
  @{ browser = 'chrome';    url = 'https://www.youtube.com';   out = '.\traces\youtube-chrome.json' }
)

foreach ($c in $captures) {
  Write-Host ''
  Write-Host ('=== Capturing ' + $c.url + ' in ' + $c.browser + ' ===') -ForegroundColor Cyan
  & powershell -NoProfile -File scripts\audit-trace-launch.ps1 -Browser $c.browser -Url $c.url -OutPath $c.out
  Start-Sleep -Seconds 3
}

Write-Host ''
Write-Host '=== Trace files ===' -ForegroundColor Green
Get-ChildItem traces\*.json | ForEach-Object {
  '{0,-30} {1,8} KB' -f $_.Name, [math]::Round($_.Length / 1KB, 0)
}
