@echo off
title TaskFlow Workspace - UKK PPLG Launcher
cd /d "%~dp0"

echo Menjalankan TaskFlow Fullstack Launcher...
node start.js %*

if errorlevel 1 (
    echo.
    echo [INFO] Launcher berhenti. Periksa pesan di atas lalu tekan tombol apa saja untuk menutup.
    pause >nul
)

