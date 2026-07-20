$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gameFile = Join-Path $gameRoot 'index.html'
$edgeCandidates = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show('Microsoft Edge was not found.','through777 Run Bug') | Out-Null
  exit 1
}
$uri = [System.Uri]::new($gameFile).AbsoluteUri
Start-Process -FilePath $edge -ArgumentList @("--app=$uri", '--window-size=1120,650', '--disable-features=msEdgeSidebarV2')
