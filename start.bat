@echo off
chcp 65001 >nul
title Khởi Động Racehorse Transport System (Docker)
color 0A

echo =============================================================================
echo      RACEHORSE TRANSPORT SYSTEM - KHỞI ĐỘNG HỆ THỐNG TOÀN DIỆN VỚI DOCKER
echo =============================================================================
echo.

:: 1. Tự động kiểm tra và nạp PATH cho Docker nếu chưa có trong phiên hiện tại
set "DOCKER_BIN=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin"
if exist "%DOCKER_BIN%\docker.exe" (
    set "PATH=%DOCKER_BIN%;%PATH%"
)
if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
    set "PATH=C:\Program Files\Docker\Docker\resources\bin;%PATH%"
)

:: 2. Kiểm tra Docker CLI
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong tim thay lenh docker tren he thong!
    echo Vui long kiem tra Docker Desktop da duoc cai dat.
    pause
    exit /b 1
)

:: 3. Kiểm tra Docker Daemon đang chạy chưa, nếu chưa thì tự động bật Docker Desktop
echo [*] Dang kiem tra trang thai Docker Daemon...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Docker Desktop chua khoi dong. Dang tu dong bat Docker Desktop...
    if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
        start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
    ) else if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
    echo [*] Dang doi Docker Desktop san sang (khoang 15-30 giay)...
    :WAIT_DOCKER
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo     Van dang doi Docker engine khoi dong...
        goto WAIT_DOCKER
    )
)
echo [OK] Docker engine da san sang!
echo.

:: 4. Chạy 1 lệnh khởi động toàn bộ hệ thống
echo =============================================================================
echo [*] Dang build va khoi dong: Database (SQL Server) + Backend (API) + Frontend (React)...
echo =============================================================================
echo.
docker compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the khoi dong he thong voi Docker Compose.
    pause
    exit /b 1
)

echo.
echo =============================================================================
echo                  TOAN BO HE THONG DA KHOI DONG THANH CONG!
echo =============================================================================
echo.
echo  - Frontend Web UI:        http://localhost:5173
echo  - Ho so Nhat Ban (AQS):   http://localhost:5173/japan-route
echo  - Backend Swagger API:    http://localhost:5129/swagger
echo  - Database (MSSQL):       localhost,14333 (User: sa / Pass: RaceHorse@2026!Db)
echo.
echo =============================================================================
echo.
echo Dang mo trinh duyet...
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo.
echo Nhan phim bat ky de dong cua so nay (He thong van tiep tuc chay ngam)...
pause >nul
