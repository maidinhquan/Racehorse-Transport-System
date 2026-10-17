# =============================================================================
# RACEHORSE TRANSPORT SYSTEM - KHỞI ĐỘNG HỆ THỐNG VỚI DOCKER (POWERSHELL)
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "     RACEHORSE TRANSPORT SYSTEM - KHỞI ĐỘNG HỆ THỐNG TOÀN DIỆN VỚI DOCKER" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# 1. Tự động nạp PATH cho Docker nếu chưa có trong phiên hiện tại
$dockerBin = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin"
if (Test-Path "$dockerBin\docker.exe") {
    $env:Path = "$dockerBin;" + $env:Path
}

# 2. Kiểm tra Docker
try {
    $dockerVer = docker --version
    Write-Host "[OK] Docker CLI: $dockerVer" -ForegroundColor Green
} catch {
    Write-Host "[LỖI] Không tìm thấy lệnh docker. Vui lòng kiểm tra Docker Desktop đã cài đặt." -ForegroundColor Red
    exit 1
}

# 3. Kiểm tra Docker daemon
Write-Host "[*] Đang kiểm tra trạng thái Docker daemon..." -ForegroundColor Yellow
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "[!] Docker Desktop chưa chạy. Đang khởi động Docker Desktop..." -ForegroundColor Yellow
    $desktopApp = "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
    if (Test-Path $desktopApp) {
        Start-Process -FilePath $desktopApp
    }
    Write-Host "[*] Đang đợi Docker engine sẵn sàng (15-30 giây)..." -ForegroundColor Yellow
    while (-not (docker info 2>$null)) {
        Start-Sleep -Seconds 3
    }
}
Write-Host "[OK] Docker engine đã sẵn sàng!" -ForegroundColor Green

# 4. Khởi động hệ thống với 1 lệnh
Write-Host "`n[*] Đang build và khởi động toàn bộ hệ thống..." -ForegroundColor Cyan
docker compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=============================================================================" -ForegroundColor Green
    Write-Host "                 TOÀN BỘ HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG!" -ForegroundColor Green
    Write-Host "=============================================================================" -ForegroundColor Green
    Write-Host "  - Frontend Web UI:        http://localhost:5173" -ForegroundColor White
    Write-Host "  - Hồ sơ Nhật Bản (AQS):   http://localhost:5173/japan-route" -ForegroundColor White
    Write-Host "  - Backend Swagger API:    http://localhost:5129/swagger" -ForegroundColor White
    Write-Host "  - Database (MSSQL):       localhost,14333 (User: sa / Pass: RaceHorse@2026!Db)" -ForegroundColor White
    Write-Host "=============================================================================" -ForegroundColor Green

    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5173"
} else {
    Write-Host "[LỖI] Khởi động hệ thống thất bại. Vui lòng kiểm tra log lỗi ở trên." -ForegroundColor Red
}
