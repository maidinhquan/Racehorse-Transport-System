@echo off
chcp 65001 >nul
title Dừng Racehorse Transport System (Docker)
color 0C

echo =============================================================================
echo          RACEHORSE TRANSPORT SYSTEM - DỪNG VÀ GIẢI PHÓNG HỆ THỐNG
echo =============================================================================
echo.

set "DOCKER_BIN=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin"
if exist "%DOCKER_BIN%\docker.exe" (
    set "PATH=%DOCKER_BIN%;%PATH%"
)
if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
    set "PATH=C:\Program Files\Docker\Docker\resources\bin;%PATH%"
)

echo [*] Đang dừng toàn bộ các container hệ thống...
docker compose down

echo.
echo =============================================================================
echo       Đã dừng toàn bộ hệ thống an toàn. Dữ liệu Database vẫn được bảo lưu!
echo =============================================================================
echo.
pause
