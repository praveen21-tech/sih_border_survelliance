$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Join-Path $PSScriptRoot "backend")

if (-not (Test-Path "weights\yolo11n.pt")) {
    New-Item -ItemType Directory -Path "weights" -Force | Out-Null
    $src = "D:\CCTVBORDERSURVEILLANCE\backend\yolo11n.pt"
    if (Test-Path $src) { Copy-Item $src "weights\yolo11n.pt" } else { Write-Host "weights\yolo11n.pt will be downloaded by ultralytics on first run" }
}

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000