@echo off
echo Installing Bootstrap and dependencies...
call npm install bootstrap@5.3.2 bootstrap-icons@1.11.1
if %errorlevel% neq 0 (
    echo npm install failed. Please check your npm installation and try again.
    pause
    exit /b %errorlevel%
)
echo Bootstrap installed successfully!
echo Starting Next.js development server...
call npm run dev
if %errorlevel% neq 0 (
    echo npm run dev failed.
    pause
    exit /b %errorlevel%
)
pause
