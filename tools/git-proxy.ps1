# Configure Git HTTP/HTTPS proxy for GitHub access.
# Usage:
#   .\tools\git-proxy.ps1 -Proxy "http://127.0.0.1:7890"
#   .\tools\git-proxy.ps1 -Clear
param(
    [string]$Proxy,
    [switch]$Clear
)

$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

if ($Clear) {
    git config --global --unset-all http.proxy 2>$null
    git config --global --unset-all https.proxy 2>$null
    [Environment]::SetEnvironmentVariable("GIT_PROXY", $null, "User")
    [Environment]::SetEnvironmentVariable("HTTP_PROXY", $null, "User")
    [Environment]::SetEnvironmentVariable("HTTPS_PROXY", $null, "User")
    Write-Host "Git proxy cleared."
    exit 0
}

if (-not $Proxy) {
    Write-Host "Set proxy for Git and sync script:"
    Write-Host '  .\tools\git-proxy.ps1 -Proxy "http://127.0.0.1:7890"'
    Write-Host "Clear proxy:"
    Write-Host "  .\tools\git-proxy.ps1 -Clear"
    exit 1
}

git config --global http.proxy $Proxy
git config --global https.proxy $Proxy
[Environment]::SetEnvironmentVariable("GIT_PROXY", $Proxy, "User")
[Environment]::SetEnvironmentVariable("HTTP_PROXY", $Proxy, "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", $Proxy, "User")
Write-Host "Proxy set to $Proxy (git + GIT_PROXY env)."
