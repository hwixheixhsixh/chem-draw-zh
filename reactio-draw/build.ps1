# 拉取上游、应用中文补丁、编译（Reactio Draw）
param(
  [string]$Tag = 'v1.13',
  [string]$Upstream = 'https://github.com/Paivel/reactio-draw.git',
  [string]$Dir = ''
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $Dir) { $Dir = Join-Path $root 'build\reactio-draw' }

if (-not (Test-Path (Join-Path $Dir 'index.html'))) {
  Write-Host "克隆上游 $Tag ..."
  git clone --depth 1 --branch $Tag $Upstream $Dir
}
node (Join-Path $PSScriptRoot 'apply.mjs') $Dir
$env:CGO_ENABLED = '0'
Push-Location (Join-Path $Dir 'windows-app')
try {
  go build -trimpath -ldflags "-H windowsgui -s -w" -o (Join-Path $root 'build\ReactioDraw.exe') .
  go build -trimpath -ldflags "-s -w" -o (Join-Path $root 'build\reactio.exe') .\reactio
} finally { Pop-Location }
Write-Host "`n编译完成: $(Join-Path $root 'build')\ReactioDraw.exe"
