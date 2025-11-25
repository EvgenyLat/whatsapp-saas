@echo off
echo ================================================
echo Running Integration Tests
echo ================================================
echo.

echo [1/3] Starting PostgreSQL...
docker-compose up -d postgres
timeout /t 3 /nobreak >nul

echo [2/3] Applying migrations...
call npx prisma migrate deploy

echo [3/3] Running tests...
echo.

call npm run test:integration -- --testPathPattern=zero-typing --verbose

echo.
echo ================================================
echo Test execution complete!
echo ================================================
pause
