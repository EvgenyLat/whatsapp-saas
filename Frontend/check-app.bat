@echo off
echo Checking application for errors...
echo.

echo 1. Checking TypeScript compilation...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo TypeScript compilation failed!
    pause
    exit /b %errorlevel%
)

echo 2. TypeScript compilation successful!
echo.

echo 3. Starting Next.js development server...
echo If you see any errors, they will be displayed below:
echo.
call npm run dev
