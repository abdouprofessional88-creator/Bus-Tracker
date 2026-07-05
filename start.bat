@echo off
title Bus Tracking System
echo =====================================
echo   Bus Tracking System
echo =====================================
echo.

echo [1/3] Preparing data...
cd /d "%~dp0server"
node config\seed.js
echo.

echo [2/3] Starting server (port 5000)...
start "Bus Server" cmd /c "title Bus Server && node server.js && pause"
timeout /t 3 /nobreak >nul

echo [3/3] Starting client (port 5173, network accessible)...
start "Bus Client" cmd /c "title Bus Client && cd /d %~dp0client && npx vite --host && pause"

echo.
echo =====================================
echo   System is Running!
echo =====================================
echo.
echo   Local:   http://localhost:5173
echo   Network: Check the client window for your IP
echo.
echo   Admin:     admin@owner.com / password123
echo   Driver:    driver1@test.com / password123
echo   Passenger: pass1@test.com / password123
echo.
echo   Share the Network URL with others on your WiFi!
echo.
pause
