@echo off
echo ========================================
echo Backend API Connection Test
echo ========================================
echo.

echo Testing backend health endpoint...
curl -s http://localhost:8000/health
echo.
echo.

echo Testing root endpoint...
curl -s http://localhost:8000/
echo.
echo.

echo Testing with invalid login (should get 401)...
curl -s -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d "{\"username\":\"test\",\"password\":\"test\"}"
echo.
echo.

echo ========================================
echo Test Complete!
echo If you see JSON responses above, the backend is working correctly.
echo ========================================
pause
