$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$blenderExe = 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe'
$pythonScript = Join-Path $PSScriptRoot 'blender\generate_broken_halo_assets.py'
$outDir = Join-Path $repoRoot 'public\assets\models'
$kitbashDir = Join-Path $outDir 'kitbash'

if (-not (Test-Path -LiteralPath $blenderExe)) {
  throw "Blender executable not found at $blenderExe"
}

if (-not (Test-Path -LiteralPath $pythonScript)) {
  throw "Generator script not found at $pythonScript"
}

if (-not (Test-Path -LiteralPath $kitbashDir)) {
  throw "Kitbash directory not found at $kitbashDir"
}

& $blenderExe --background --factory-startup --python $pythonScript -- $outDir $kitbashDir

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
