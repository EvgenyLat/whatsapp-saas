@echo off
echo Starting WhatsApp SaaS Admin Frontend...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Error installing dependencies. Please check your Node.js installation.
        pause
        exit /b 1
    )
)

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo Creating .env.local file...
    echo NEXT_PUBLIC_API_BASE=http://localhost:4000 > .env.local
    echo NODE_ENV=development >> .env.local
    echo Environment file created.
)

echo Starting development server on http://localhost:3000...
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
