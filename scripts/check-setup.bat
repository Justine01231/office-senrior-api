@echo off
echo ========================================
echo    CHECKING DOCKER AND POSTGRESQL
echo ========================================
echo.

echo [1] Checking Docker...
docker --version 2>nul
if %errorlevel% equ 0 (
    echo ✅ Docker is installed
    echo.
    echo [2] Checking Docker containers...
    docker ps
) else (
    echo ❌ Docker is NOT installed or not in PATH
)

echo.
echo [3] Checking PostgreSQL installation...
psql --version 2>nul
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL command line tools are installed
) else (
    echo ❌ PostgreSQL command line tools are NOT installed
)

echo.
echo [4] Checking what's running on port 5432...
netstat -an | findstr :5432
if %errorlevel% equ 0 (
    echo ✅ Something is running on port 5432 (likely PostgreSQL)
) else (
    echo ❌ Nothing is running on port 5432
)

echo.
echo [5] Checking PostgreSQL processes...
tasklist | findstr postgres
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL processes found
) else (
    echo ❌ No PostgreSQL processes found
)

echo.
echo ========================================
echo           CHECK COMPLETE
echo ========================================
pause
