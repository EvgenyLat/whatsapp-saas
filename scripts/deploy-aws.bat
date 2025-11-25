@echo off
REM Windows wrapper for deploy-aws.sh
REM Requires Git Bash or WSL to be installed

echo.
echo ========================================
echo AWS Infrastructure Deployment
echo ========================================
echo.

REM Check if Git Bash is available
where bash >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using Git Bash...
    bash deploy-aws.sh %*
    goto :end
)

REM Check if WSL is available
where wsl >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using WSL...
    wsl bash deploy-aws.sh %*
    goto :end
)

REM Neither Git Bash nor WSL found
echo ERROR: Neither Git Bash nor WSL found.
echo.
echo Please install one of the following:
echo   1. Git for Windows (includes Git Bash): https://git-scm.com/download/win
echo   2. Windows Subsystem for Linux (WSL): https://docs.microsoft.com/en-us/windows/wsl/install
echo.
pause
exit /b 1

:end
