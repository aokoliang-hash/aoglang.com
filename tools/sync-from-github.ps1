# Sync aoglang.com from GitHub (main branch).
# Usage:
#   .\tools\sync-from-github.ps1
#   .\tools\sync-from-github.ps1 -Proxy "http://127.0.0.1:7890"
param(
    [string]$Proxy = $env:GIT_PROXY,
    [string]$Branch = "main",
    [string]$Repo = "aokoliang-hash/aoglang.com",
    [string]$Target = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)
)

$ErrorActionPreference = "Stop"
$zipUrl = "https://codeload.github.com/$Repo/zip/refs/heads/$Branch"
$zipPath = Join-Path $env:TEMP "aoglang-$Branch.zip"
$extractRoot = Join-Path $env:TEMP "aoglang-sync-$Branch"
$srcDir = Join-Path $extractRoot "$($Repo.Split('/')[-1])-$Branch"

if (-not $Target) {
    $Target = Split-Path $PSScriptRoot -Parent
}

Write-Host "Target: $Target"
Write-Host "Downloading $zipUrl ..."

$curlArgs = @(
    "-L", "--ssl-no-revoke", "--retry", "5", "--retry-delay", "3",
    "-o", $zipPath, $zipUrl
)
if ($Proxy) {
    $curlArgs += @("--proxy", $Proxy)
    Write-Host "Using proxy: $Proxy"
}

& curl.exe @curlArgs
if ($LASTEXITCODE -ne 0) {
    throw "Download failed (curl exit $LASTEXITCODE)."
}

$size = (Get-Item $zipPath).Length
if ($size -lt 100000) {
    throw "Downloaded file too small ($size bytes). Check network or proxy."
}
Write-Host "Downloaded $size bytes."

if (Test-Path $extractRoot) {
    Remove-Item $extractRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
tar -xf $zipPath -C $extractRoot

if (-not (Test-Path $srcDir)) {
    throw "Extract folder not found: $srcDir"
}

Get-ChildItem $srcDir -Force | ForEach-Object {
    $dest = Join-Path $Target $_.Name
    if ($_.PSIsContainer) {
        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
        Copy-Item $_.FullName $dest -Recurse -Force
    } else {
        Copy-Item $_.FullName $dest -Force
    }
}

$count = @(Get-ChildItem $Target -Recurse -File | Where-Object { $_.FullName -notlike "*\.git\*" }).Count
Write-Host "Sync complete: $count files in $Target"
