# Visual modeの原寸を保管し、表示用PNGだけを縮小する。実行時の依存ではない。
param([ValidateRange(1, 1254)][int]$MaxSide = 512)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $projectRoot 'assets\visual'
$originalRoot = Join-Path $projectRoot 'asset_original\visual'
$magickCommand = (Get-Command magick -ErrorAction Stop).Source
$geometry = '{0}x{0}>' -f $MaxSide
New-Item -ItemType Directory -Path $originalRoot -Force | Out-Null

foreach ($name in @('bomb.png', 'explosion.png')) {
    $assetPath = Join-Path $assetRoot $name
    $originalPath = Join-Path $originalRoot $name
    $temporaryPath = Join-Path $assetRoot ($name + '.optimized.tmp.png')
    if (-not (Test-Path -LiteralPath $originalPath)) {
        Copy-Item -LiteralPath $assetPath -Destination $originalPath
        if ((Get-FileHash -LiteralPath $assetPath).Hash -ne (Get-FileHash -LiteralPath $originalPath).Hash) {
            throw "原寸の退避確認に失敗しました: $name"
        }
    }
    $originalHash = (Get-FileHash -LiteralPath $originalPath).Hash
    try {
        # 常に原寸を入力し、RGBA8・透過PNGのまま保存する。
        & $magickCommand $originalPath -filter Lanczos -resize $geometry -depth 8 -define png:compression-level=9 ('PNG32:' + $temporaryPath)
        if ($LASTEXITCODE -ne 0) { throw "縮小に失敗しました: $name" }
        $details = & $magickCommand identify -format '%w %h %[opaque]' $temporaryPath
        if ($LASTEXITCODE -ne 0) { throw "出力を確認できませんでした: $name" }
        $parts = $details -split '\s+'
        if ([int]$parts[0] -gt $MaxSide -or [int]$parts[1] -gt $MaxSide -or $parts[2] -ne 'false') {
            throw "出力の寸法または透過が不正です: $name"
        }
        if ((Get-FileHash -LiteralPath $originalPath).Hash -ne $originalHash) { throw "原寸が変更されています: $name" }
        Copy-Item -LiteralPath $temporaryPath -Destination $assetPath -Force
        [PSCustomObject]@{
            File = $name
            OriginalBytes = (Get-Item -LiteralPath $originalPath).Length
            OptimizedBytes = (Get-Item -LiteralPath $assetPath).Length
            Size = $parts[0] + 'x' + $parts[1]
            OriginalSHA256 = $originalHash
        }
    }
    finally {
        if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath }
    }
}
