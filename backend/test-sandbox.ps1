param([string]$BaseUrl = 'http://localhost:5080')
$ErrorActionPreference = 'Stop'
$localConfig = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'appsettings.Local.json') -Raw | ConvertFrom-Json
$signingSecret = if ($env:Vnpay__HashSecret) { $env:Vnpay__HashSecret } else { $localConfig.Vnpay.HashSecret }
$tmnCode = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'appsettings.json') -Raw | ConvertFrom-Json).Vnpay.TmnCode
function Assert($condition, $message) {
    if (-not $condition) { throw $message }
    Write-Host "PASS: $message"
}
function New-Payment {
    Invoke-RestMethod "$BaseUrl/api/payments/vnpay" -Method Post -ContentType 'application/json' -Body '{"amount":10000}'
}
function Get-Callback($payment, [string]$response = '00', [string]$status = '00', [string]$amount = '1000000') {
    return @{
        vnp_TmnCode = $tmnCode; vnp_TxnRef = $payment.id; vnp_Amount = $amount
        vnp_ResponseCode = $response; vnp_TransactionStatus = $status
        vnp_TransactionNo = '12345678'; vnp_OrderInfo = 'Thanh toan thu nghiem'
        vnp_BankCode = 'NCB'; vnp_PayDate = '20261008120000'
    }
}
function Get-SignedQuery($fields) {
    $pairs = foreach ($key in ($fields.Keys | Sort-Object -CaseSensitive)) {
        [System.Net.WebUtility]::UrlEncode($key) + '=' + [System.Net.WebUtility]::UrlEncode([string]$fields[$key])
    }
    $canonical = $pairs -join '&'
    $hmac = [System.Security.Cryptography.HMACSHA512]::new([Text.Encoding]::UTF8.GetBytes($signingSecret))
    try { $hash = [Convert]::ToHexString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($canonical))).ToLowerInvariant() }
    finally { $hmac.Dispose() }
    return $canonical + '&vnp_SecureHash=' + $hash
}
function Send-Ipn($fields) {
    Invoke-RestMethod ($BaseUrl + '/api/payments/vnpay/ipn?' + (Get-SignedQuery $fields))
}

$payment = New-Payment
Assert ($payment.paymentUrl.StartsWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?')) 'Sandbox URL only'
$uri = [Uri]$payment.paymentUrl
$urlFields = @{}
foreach ($part in $uri.Query.TrimStart('?').Split('&')) {
    $pair = $part.Split('=', 2)
    $urlFields[[Net.WebUtility]::UrlDecode($pair[0])] = [Net.WebUtility]::UrlDecode($pair[1])
}
$urlHash = $urlFields.vnp_SecureHash
$urlFields.Remove('vnp_SecureHash')
Assert ((Get-SignedQuery $urlFields).EndsWith($urlHash)) 'Checkout signature matches independent signer'
Assert ($urlFields.vnp_Amount -eq '1000000') 'VND amount multiplied by 100'
$created = [DateTime]::ParseExact($urlFields.vnp_CreateDate, 'yyyyMMddHHmmss', $null)
$vietnamNow = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(7)).DateTime
Assert ([Math]::Abs(($created - $vietnamNow).TotalSeconds) -lt 30) 'CreateDate uses GMT+7'
$fields = Get-Callback $payment
$return = Invoke-RestMethod ($BaseUrl + '/api/payments/vnpay/return?' + (Get-SignedQuery $fields))
Assert ($return.status -eq 'Pending') 'Return URL cannot mark transaction paid'
$tampered = Get-SignedQuery $fields
$tampered = $tampered.Replace('vnp_Amount=1000000', 'vnp_Amount=2000000')
$bad = Invoke-RestMethod ($BaseUrl + '/api/payments/vnpay/ipn?' + $tampered)
Assert ($bad.RspCode -ceq '97') 'Tampered callback rejected'
$wrongAmount = Get-Callback $payment '00' '00' '2000000'
Assert ((Send-Ipn $wrongAmount).RspCode -eq '04') 'Signed wrong amount rejected'
$wrongMerchant = Get-Callback $payment
$wrongMerchant.vnp_TmnCode = 'OTHER123'
Assert ((Send-Ipn $wrongMerchant).RspCode -eq '97') 'Wrong terminal rejected'
$missing = Get-Callback $payment
$missing.vnp_TxnRef = [Guid]::NewGuid().ToString('N')
Assert ((Send-Ipn $missing).RspCode -eq '01') 'Unknown transaction rejected'
$duplicate = Invoke-RestMethod ($BaseUrl + '/api/payments/vnpay/ipn?' + (Get-SignedQuery $fields) + '&vnp_Amount=1000000')
Assert ($duplicate.RspCode -eq '97') 'Duplicate query parameters rejected'
Assert ((Send-Ipn $fields).RspCode -eq '00') 'Valid successful IPN accepted'
Assert ((Send-Ipn $fields).RspCode -eq '02') 'Repeated IPN is idempotent'
$stored = Invoke-RestMethod "$BaseUrl/api/payments/$($payment.id)"
Assert ($stored.status -eq 'Paid') 'Paid status persisted'
$failed = New-Payment
Assert ((Send-Ipn (Get-Callback $failed '24' '02')).RspCode -eq '00') 'Cancellation acknowledged'
Assert ((Invoke-RestMethod "$BaseUrl/api/payments/$($failed.id)").status -eq 'Failed') 'Cancellation stored as failed'
$mismatch = New-Payment
[void](Send-Ipn (Get-Callback $mismatch '00' '02'))
Assert ((Invoke-RestMethod "$BaseUrl/api/payments/$($mismatch.id)").status -eq 'Failed') 'Success requires both response and transaction status 00'
$invalid = Invoke-WebRequest "$BaseUrl/api/payments/vnpay" -Method Post -ContentType 'application/json' -Body '{"amount":10000.5}' -SkipHttpErrorCheck
Assert ($invalid.StatusCode -eq 400) 'Fractional VND rejected'
Write-Host 'All Sandbox API checks passed. No request was sent to VNPAY.'
