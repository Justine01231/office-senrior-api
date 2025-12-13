@echo off
echo ========================================
echo Office of Seniors - Backend Server
echo ========================================
echo.

REM Kill any existing bun processes
echo Stopping any existing backend instances...
taskkill /F /IM bun.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
echo.
echo Server will be accessible at:
echo   - http://localhost:8000
echo   - http://10.0.2.2:8000 (from Android Emulator)
echo   - http://192.168.0.100:8000 (from Physical Device on same network)
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

bun run dev
