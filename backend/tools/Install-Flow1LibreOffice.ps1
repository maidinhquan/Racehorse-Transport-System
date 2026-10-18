[CmdletBinding()]
param([string]$RuntimeRoot = (Join-Path $PSScriptRoot '../WebApi/App_Data/flow1/runtime/libreoffice-26.8.1'))
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'This provisioner extracts the Windows x64 runtime; provision LibreOffice separately on Linux.' }
$root = [IO.Path]::GetFullPath($RuntimeRoot)
[void][IO.Directory]::CreateDirectory($root)
$msi = Join-Path $root 'LibreOffice_26.8.1_Win_x86-64.msi'
$expected = 'c6298b10cfa1748bcbedad94c62ce771e240e5021bfd6d7a967cd571b04b5312'
$url = 'https://download.documentfoundation.org/libreoffice/stable/26.8.1/win/x86_64/LibreOffice_26.8.1_Win_x86-64.msi'
if (-not (Test-Path -LiteralPath $msi)) {
    Write-Output 'Downloading official LibreOffice 26.8.1 Windows x64 package...'
    $ProgressPreference = 'SilentlyContinue'
    # Direct mirror is listed by the official MirrorBrain manifest. Pin the official hash.
    $mirror = 'https://mirror.freedif.org/TDF/libreoffice/stable/26.8.1/win/x86_64/LibreOffice_26.8.1_Win_x86-64.msi'
    $partial = $msi + '.partial'
    Invoke-WebRequest -Uri $mirror -OutFile $partial -TimeoutSec 180
    if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
        throw 'Downloaded LibreOffice package failed hash verification.'
    }
    Move-Item -LiteralPath $partial -Destination $msi
}
$actual = (Get-FileHash -LiteralPath $msi -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw 'Downloaded LibreOffice SHA-256 does not match the official mirror-list digest. Do not execute this package.' }
$target = Join-Path $root 'extracted'
$binary = Join-Path $target 'program/soffice.com'
if (-not (Test-Path -LiteralPath $binary)) {
    Write-Output 'Extracting administrative image to private runtime folder (no desktop install/associations)...'
    $log = Join-Path $root 'extract.log'
    $arguments = @('/a', ('"' + $msi + '"'), '/qn', '/norestart', ('TARGETDIR="' + $target + '"'), '/L*v', ('"' + $log + '"'))
    $process = Start-Process -FilePath "$env:SystemRoot/System32/msiexec.exe" -ArgumentList $arguments -WindowStyle Hidden -PassThru
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while (-not $process.HasExited) {
        if ($timer.Elapsed.TotalMinutes -gt 10) { throw 'Administrative extraction exceeded timeout; inspect its process/log before retrying.' }
        Start-Sleep -Milliseconds 500
        $process.Refresh()
    }
    if ($process.ExitCode -notin @(0,3010)) { throw "Administrative extraction failed ($($process.ExitCode)); see private extract.log." }
}
if (-not (Test-Path -LiteralPath $binary)) { throw 'Extracted soffice.com was not found.' }
& $binary --version
if ($LASTEXITCODE -ne 0) { throw 'LibreOffice runtime version check failed.' }
$result = [ordered]@{ version='26.8.1'; source=$url; sha256=$actual; executable=$binary; preparedAtUtc=[DateTime]::UtcNow.ToString('O') }
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'runtime.json') -Encoding utf8
$result | ConvertTo-Json
