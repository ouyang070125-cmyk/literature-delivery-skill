param(
  [string]$Url = "about:blank",
  [int]$Port = 9222,
  [string]$Profile = "",
  [switch]$Headless
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($Profile)) {
  $Profile = Join-Path (Split-Path -Parent $scriptRoot) ".chrome-profile"
}
$Profile = [System.IO.Path]::GetFullPath($Profile)
New-Item -ItemType Directory -Force -Path $Profile | Out-Null

$chromeCandidates = @(
  (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
  (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe"),
  (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe")
) | Where-Object { $_ -and (Test-Path $_) }

if ($chromeCandidates.Count -eq 0) {
  throw "Chrome/Edge not found. Install Google Chrome or set a browser path manually."
}
$chrome = $chromeCandidates[0]

function Test-Cdp {
  param([int]$P)
  try {
    $null = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$P/json/version" -TimeoutSec 2
    return $true
  } catch {
    return $false
  }
}

if (Test-Cdp -P $Port) {
  Write-Output ("CDP already available at http://127.0.0.1:{0}" -f $Port)
  Write-Output ("Browser: {0}" -f $chrome)
  Write-Output ("Profile: {0}" -f $Profile)
  exit 0
}

$arguments = @(
  "--remote-debugging-port=$Port",
  "--remote-allow-origins=*",
  "--user-data-dir=$Profile",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-features=Translate",
  "--start-maximized"
)
if ($Headless) { $arguments += "--headless=new" }
$arguments += $Url

$process = Start-Process -FilePath $chrome -ArgumentList $arguments -PassThru
$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
  if (Test-Cdp -P $Port) { break }
  Start-Sleep -Milliseconds 400
}

if (-not (Test-Cdp -P $Port)) {
  throw "Chrome started (PID $($process.Id)) but CDP did not become ready on port $Port."
}

Write-Output ("Chrome PID: {0}" -f $process.Id)
Write-Output ("CDP: http://127.0.0.1:{0}" -f $Port)
Write-Output ("Profile: {0}" -f $Profile)
Write-Output ("URL: {0}" -f $Url)
Write-Output "Log in to the library in this window. Do not share your password with the agent."
