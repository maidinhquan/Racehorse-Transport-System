[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$LegacyRoot,
    [Parameter(Mandatory)][string]$WebApiRoot,
    [Parameter(Mandatory)][string]$ReturnUrl,
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
# Explicit local configuration bridge; never starts an app, touches SQL, sends mail or contacts a provider.
$legacyPath = [IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetFullPath($LegacyRoot))
$activePath = [IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetFullPath($WebApiRoot))
if ($activePath -eq (Join-Path $legacyPath 'backend/WebApi')) { throw 'Use an isolated worktree target; preserve primary user configuration.' }
if (-not (Test-Path -LiteralPath (Join-Path $activePath 'WebApi.csproj'))) { throw 'Target must be an existing active WebApi directory.' }
$returnUri = $null
if (-not [Uri]::TryCreate($ReturnUrl, [UriKind]::Absolute, [ref]$returnUri) -or $returnUri.UserInfo -or $returnUri.Query -or $returnUri.Fragment -or
    -not ($returnUri.Scheme -eq 'https' -or ($returnUri.Scheme -eq 'http' -and $returnUri.IsLoopback)) -or
    $returnUri.AbsolutePath -ne '/customer/payments/return') { throw 'Return URL must be the active customer return route, HTTPS or loopback HTTP.' }
$config = @{}
foreach ($name in @('appsettings.json', 'appsettings.Local.json')) {
    $file = Join-Path $legacyPath ('backend/' + $name)
    if (Test-Path -LiteralPath $file) {
        $part = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json -AsHashtable
        if ($part.Vnpay) { foreach ($key in $part.Vnpay.Keys) { $config[$key] = $part.Vnpay[$key] } }
    }
}
if ($config.TmnCode -notmatch '^[A-Za-z0-9]{8}$' -or [string]::IsNullOrWhiteSpace($config.HashSecret) -or
    $config.PaymentUrl -ne 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html') { throw 'Legacy Sandbox credential configuration needs review; values were not printed.' }
$target = Join-Path $activePath 'appsettings.Flow1Sandbox.Local.json'
$local = if (Test-Path -LiteralPath $target) { Get-Content -LiteralPath $target -Raw | ConvertFrom-Json -AsHashtable } else { @{} }
if (-not $local.Flow1) { $local.Flow1 = @{} }
if ($local.Flow1.Vnpay -and (($local.Flow1.Vnpay.HashSecret -and $local.Flow1.Vnpay.HashSecret -ne $config.HashSecret) -or
    ($local.Flow1.Vnpay.TmnCode -and $local.Flow1.Vnpay.TmnCode -ne $config.TmnCode))) { throw 'Target already has different VNPay credentials; review before replacement.' }
$local.Flow1.Vnpay = @{ Enabled = $true; TmnCode = $config.TmnCode; HashSecret = $config.HashSecret; PaymentUrl = $config.PaymentUrl; ReturnUrl = $ReturnUrl }
$primaryLocal = Join-Path $legacyPath 'backend/WebApi/appsettings.Local.json'
if (Test-Path -LiteralPath $primaryLocal) {
    $source = Get-Content -LiteralPath $primaryLocal -Raw | ConvertFrom-Json -AsHashtable
    if (-not $local.Flow1.Maps -and $source.Flow1.Maps) { $local.Flow1.Maps = $source.Flow1.Maps }
    if (-not $local.Flow1.Estimate -and $source.Flow1.Estimate) { $local.Flow1.Estimate = $source.Flow1.Estimate }
}
if ($Apply) {
    # Same-directory atomic file replacement. Secrets remain only in the ignored local file.
    $temp = $target + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
    try { [IO.File]::WriteAllText($temp, ($local | ConvertTo-Json -Depth 20), [Text.UTF8Encoding]::new($false)); Move-Item -LiteralPath $temp -Destination $target -Force }
    finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp } }
    Write-Output 'Configured active Sandbox/map options in the isolated ignored local file. No provider or SQL request was sent.'
} else { Write-Output 'Validated Sandbox/map configuration bridge. Dry-run only; use -Apply to write the isolated ignored local file.' }
