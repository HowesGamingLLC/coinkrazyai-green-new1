@echo off
REM CoinkrazyAI Docker Startup Script for Windows
REM This script sets up and starts your application with Docker Compose

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   CoinkrazyAI Docker Startup Script
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Desktop.
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo Creating .env from .env.example...
    echo.
    
    if not exist .env.example (
        echo [ERROR] .env.example file not found!
        exit /b 1
    )
    
    copy .env.example .env
    echo [SUCCESS] .env file created
    echo [WARNING] Please update the following in .env:
    echo   - DATABASE_URL (use Neon or configure local PostgreSQL)
    echo   - VITE_PUBLIC_BUILDER_KEY
    echo   - DOMAIN (for SSL certificates)
    echo   - LETSENCRYPT_EMAIL
    echo.
    
    pause
)

REM Create required directories
echo Setting up required directories...
if not exist certbot\conf mkdir certbot\conf
if not exist certbot\www mkdir certbot\www
if not exist logs mkdir logs
echo [SUCCESS] Directories ready
echo.

REM Parse command line arguments
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=up

if /i "%COMMAND%"=="up" (
    echo Starting containers...
    docker-compose up -d
    if errorlevel 1 exit /b 1
    echo [SUCCESS] Containers started!
    echo.
    
    echo Waiting for services to be ready...
    timeout /t 5 /nobreak
    
    echo [SUCCESS] Setup complete!
    echo.
    echo Services:
    echo   - App: http://localhost:80
    echo   - Database: localhost:5432
    echo   - Logs: .\logs\
    echo.
    echo Useful commands:
    echo   - View logs: docker-compose logs -f
    echo   - Stop: docker-compose down
    echo   - Rebuild: docker-compose up -d --build
    echo   - Restart: docker-compose restart
    echo.
) else if /i "%COMMAND%"=="down" (
    echo Stopping containers...
    docker-compose down
    echo [SUCCESS] Containers stopped
    echo.
) else if /i "%COMMAND%"=="logs" (
    echo Showing logs...
    docker-compose logs -f
) else if /i "%COMMAND%"=="restart" (
    echo Restarting containers...
    docker-compose restart
    echo [SUCCESS] Containers restarted
    echo.
) else if /i "%COMMAND%"=="build" (
    echo Building containers...
    docker-compose build --no-cache
    echo [SUCCESS] Build complete
    echo.
) else if /i "%COMMAND%"=="rebuild" (
    echo Rebuilding and starting containers...
    docker-compose up -d --build
    echo [SUCCESS] Rebuild complete!
    echo.
) else if /i "%COMMAND%"=="status" (
    echo Container Status:
    docker-compose ps
    echo.
) else if /i "%COMMAND%"=="clean" (
    echo [WARNING] This will stop and remove all containers and volumes!
    set /p CONFIRM="Are you sure? (y/N): "
    if /i "!CONFIRM!"=="y" (
        docker-compose down -v
        echo [SUCCESS] Cleanup complete
        echo.
    ) else (
        echo Cancelled
        echo.
    )
) else if /i "%COMMAND%"=="help" (
    echo Usage:
    echo   docker-start.bat [COMMAND]
    echo.
    echo Commands:
    echo   up       - Start containers (default)
    echo   down     - Stop containers
    echo   logs     - View container logs
    echo   restart  - Restart containers
    echo   status   - Show container status
    echo   build    - Build containers
    echo   rebuild  - Rebuild and start containers
    echo   clean    - Remove all containers and volumes
    echo   help     - Show this help message
    echo.
) else (
    echo [ERROR] Unknown command: %COMMAND%
    echo Run "docker-start.bat help" for available commands
    echo.
    exit /b 1
)

endlocal
