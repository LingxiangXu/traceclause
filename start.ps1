$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python environment creation failed.' }
    & '.\.venv\Scripts\python.exe' -m pip install -e .
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
Write-Host 'TraceClause: http://127.0.0.1:8765'
& '.\.venv\Scripts\python.exe' -m uvicorn traceclause.app:app --host 127.0.0.1 --port 8765
