# 拉取上游、应用中文补丁、编译（Octet Draw）
param(
  [string]$Tag = 'v1.1.1',
  [string]$Upstream = 'https://github.com/SamChemMan/Octet-Draw.git',
  [string]$Dir = ''
)
$ErrorActionPreference = 'Stop'
if (-not $Dir) { $Dir = Join-Path (Split-Path $PSScriptRoot -Parent) 'build\Octet-Draw' }

if (-not (Test-Path (Join-Path $Dir 'package.json'))) {
  Write-Host "克隆上游 $Tag ..."
  git clone --depth 1 --branch $Tag $Upstream $Dir
}
node (Join-Path $PSScriptRoot 'apply.mjs') $Dir
Push-Location $Dir
try {
  npm install
  npm run tauri build -- --no-bundle
} finally { Pop-Location }
Write-Host "`n编译完成: $Dir\src-tauri\target\release\octet.exe"
