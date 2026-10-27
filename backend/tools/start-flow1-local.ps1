param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = 'http://localhost:5129'
$env:ConnectionStrings__DefaultConnection = 'Server=.\SQLEXPRESS;Database=HorseTransportDB;Integrated Security=True;TrustServerCertificate=True'
Push-Location (Join-Path $repo 'backend/WebApi')
try {
    if (-not $NoBuild) {
        dotnet build (Join-Path $repo 'backend/Backend.slnx') --nologo
        if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    }
    # Foreground terminal; Ctrl+C stops it. Existing private local configuration is loaded by Program.cs.
    dotnet bin/Debug/net8.0/WebApi.dll
} finally { Pop-Location }
