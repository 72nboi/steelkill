<#
.SYNOPSIS
Downloads Steelkill Instagram photos for the website.
.EXAMPLE
.\downlider.ps1 -Browser firefox
.EXAMPLE
.\downlider.ps1 -LoginUser actual_instagram_username
.NOTES
Sign into instagram.com in the selected browser first and complete verification.
#>
[CmdletBinding()]
param(
    [string]$Profile = 'steel_kill_',
    [string]$ProjectRoot = $PSScriptRoot,
    [string]$LoginUser = '',
    [ValidateSet('chrome', 'edge', 'firefox', 'brave', 'chromium', 'opera', 'vivaldi')]
    [string]$Browser,
    [string]$CookieFile,
    [string]$SessionFile,
    [switch]$Anonymous,
    [switch]$UpdateInstaloader,
    [switch]$FullDownload
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Profile = $Profile.Trim().TrimStart('@')
$LoginUser = $LoginUser.Trim().TrimStart('@')
if ($Profile -notmatch '^[A-Za-z0-9_\.]{1,30}$') {
    throw 'Profile must be an Instagram handle (letters, numbers, underscores and dots only).'
}
if ($LoginUser -and $LoginUser -notmatch '^[A-Za-z0-9_\.]{1,30}$') {
    throw 'LoginUser must be your Instagram USERNAME, not your email, display name or website name. Copy it from instagram.com/your_username/. Hyphens are not valid.'
}
if (([int][bool]$Browser + [int][bool]$LoginUser + [int][bool]$Anonymous) -gt 1) {
    throw 'Choose one login method: -Browser firefox, -LoginUser your_username, or -Anonymous.'
}
if ($CookieFile -and -not $Browser) { throw '-CookieFile requires -Browser.' }
if ($SessionFile -and -not $LoginUser) { throw '-SessionFile requires -LoginUser.' }
if ($CookieFile -and -not (Test-Path -LiteralPath $CookieFile -PathType Leaf)) {
    throw "Cookie file not found: $CookieFile"
}
if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    throw "Project folder not found: $ProjectRoot"
}
if (-not $Browser -and -not $LoginUser -and -not $Anonymous) {
    Write-Host 'Use your Instagram username, NOT your email or business website name.' -ForegroundColor Cyan
    Write-Host 'For browser login instead, cancel and run: .\downlider.ps1 -Browser firefox'
    $LoginUser = (Read-Host 'Instagram username').Trim().TrimStart('@')
    if ($LoginUser -notmatch '^[A-Za-z0-9_\.]{1,30}$') {
        throw 'Enter a valid Instagram username, or use -Browser firefox after signing in at instagram.com.'
    }
}

$pythonCommand = $null
$pythonPrefix = @()
foreach ($candidate in @('py.exe', 'python.exe', 'python3.exe')) {
    $pythonExecutable = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($pythonExecutable) {
        $pythonCommand = $pythonExecutable.Source
        if ($candidate -eq 'py.exe') { $pythonPrefix = @('-3') }
        break
    }
}
if (-not $pythonCommand) { throw 'Install Python 3 from https://www.python.org/downloads/ and rerun this script.' }

$modules = @('instaloader')
if ($Browser) { $modules += 'browser_cookie3' }
foreach ($module in $modules) {
    & $pythonCommand @pythonPrefix -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('$module') else 1)"
    if ($LASTEXITCODE -ne 0 -or $UpdateInstaloader) {
        Write-Host "Installing $module..." -ForegroundColor Cyan
        $pipArguments = @('-m', 'pip', 'install', '--user', '--disable-pip-version-check', '--no-warn-script-location')
        if ($UpdateInstaloader) { $pipArguments += '--upgrade' }
        & $pythonCommand @pythonPrefix @pipArguments $module
        if ($LASTEXITCODE -ne 0) { throw "Could not install $module. Check your Python/pip installation and internet connection." }
    }
}

$outputDirectory = Join-Path $ProjectRoot 'public\images\instagram'
$stampFile = Join-Path $ProjectRoot '.instaloader-latest-stamps.ini'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$compatibilityRunner = Join-Path $PSScriptRoot 'scripts\instaloader_compat.py'
if (-not (Test-Path -LiteralPath $compatibilityRunner -PathType Leaf)) {
    throw "Missing downloader helper: $compatibilityRunner. Keep the scripts folder alongside downlider.ps1."
}
$loaderArguments = @(
    $compatibilityRunner,
    "--dirname-pattern=$outputDirectory",
    '--filename-pattern={date_utc:%Y-%m-%d}_{shortcode}',
    '--title-pattern=steelkill_{typename}',
    '--no-videos', '--no-video-thumbnails', '--no-captions', '--no-metadata-json',
    '--no-resume', '--sanitize-paths', '--max-connection-attempts=2', '--request-timeout=30'
)
if (-not $FullDownload) { $loaderArguments += "--latest-stamps=$stampFile" }
if ($Browser) {
    Write-Host "Using your local $Browser Instagram session. Complete verification at https://www.instagram.com/ first." -ForegroundColor Cyan
    Write-Host 'If cookie import fails, close the browser and retry. Firefox can be used if Chrome/Edge cookie encryption blocks access.'
    $loaderArguments += "--load-cookies=$Browser"
    if ($CookieFile) { $loaderArguments += "--cookiefile=$CookieFile" }
}
elseif ($LoginUser) {
    $loaderArguments += "--login=$LoginUser"
    if ($SessionFile) { $loaderArguments += "--sessionfile=$SessionFile" }
}
$loaderArguments += $Profile

Write-Host "Downloading @$Profile photos to $outputDirectory ..." -ForegroundColor Cyan
& $pythonCommand @pythonPrefix @loaderArguments
if ($LASTEXITCODE -ne 0) {
    throw @"
Instagram download did not complete. See the Instaloader message above.
If it says 'Checkpoint required', open its URL in your browser (prefix a /auth_platform/... path with https://www.instagram.com), complete Instagram's verification, then retry.
If cookies loaded but validation failed, check that the selected browser PROFILE is signed in. Use -CookieFile with its cookies.sqlite (Firefox) or Cookies database (Chrome/Edge) when you have multiple profiles.
The script includes a local workaround for Instaloader's retired login query (upstream issue #2792 / fix #2795). Cookie import success alone does not prove the session is valid.
Or use your real Instagram handle (not your email):
  .\downlider.ps1 -LoginUser your_instagram_username
Instagram may still restrict requests with a valid login. The script cannot bypass verification or rate limits.
"@
}

$images = @(Get-ChildItem -LiteralPath $outputDirectory -File | Where-Object {
    $_.Extension -match '^\.(jpg|jpeg|png|webp)$' -and $_.BaseName -notmatch 'profile_pic'
})
Write-Host "Done. $($images.Count) portfolio photos available." -ForegroundColor Green
if ($images.Count -eq 0) { Write-Warning 'No post photos yet. Try -FullDownload if saved timestamps skipped older posts.' }
Write-Host 'Run npm run build (or restart npm run dev) to refresh the website gallery.'
