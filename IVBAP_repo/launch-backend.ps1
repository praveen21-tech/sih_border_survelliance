$ErrorActionPreference = "Continue"
Set-Location -LiteralPath (Join-Path $PSScriptRoot "backend")
& (Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe") -m uvicorn app.main:app --host 0.0.0.0 --port 8000 *>> server.log