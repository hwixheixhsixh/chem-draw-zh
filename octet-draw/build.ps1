# Clone upstream, apply the Chinese UI patch, build (Octet Draw)
# Usage: powershell -ExecutionPolicy Bypass -File build.ps1 [-Tag v1.1.2] [-Dir <target dir>]
param(
  [string]$Tag = 'v1.1.2',
  [string]$Upstream = 'https://github.com/SamChemMan/Octet-Draw.git',
  [string]$Dir = ''
)
$ErrorActionPreference = 'Stop'
if (-not $Dir) { $Dir = Join-Path (Split-Path $PSScriptRoot -Parent) 'build\Octet-Draw' }

if (-not (Test-Path (Join-Path $Dir 'package.json'))) {
  Write-Host "Cloning upstream $Tag ..."
  git clone --depth 1 --branch $Tag $Upstream $Dir
}
node (Join-Path $PSScriptRoot 'apply.mjs') $Dir
Push-Location $Dir
try {
  npm install
  npm run tauri build -- --no-bundle
} finally { Pop-Location }
Write-Host ""
Write-Host "Built: $Dir\src-tauri\target\release\octet.exe"

