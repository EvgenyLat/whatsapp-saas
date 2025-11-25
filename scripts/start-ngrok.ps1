# WhatsApp SaaS - ngrok Quick Start Script
# PowerShell script to start ngrok tunnel and display setup instructions

param(
    [int]$Port = 3000,
    [string]$Region = "us"
)

Write-Host @"
========================================
WhatsApp SaaS - ngrok Tunnel Setup
========================================
"@ -ForegroundColor Cyan

# Check if ngrok is installed
Write-Host "`nChecking ngrok installation..." -ForegroundColor Yellow

$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokPath) {
    Write-Host "`n[ERROR] ngrok is not installed!" -ForegroundColor Red
    Write-Host @"

Installation Options:

1. Using Chocolatey:
   choco install ngrok

2. Using Scoop:
   scoop install ngrok

3. Manual Download:
   https://ngrok.com/download

After installation, run this script again.
"@ -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] ngrok found at: $($ngrokPath.Source)" -ForegroundColor Green

# Check if ngrok is configured with authtoken
Write-Host "`nChecking ngrok configuration..." -ForegroundColor Yellow

$ngrokConfigPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"
if (Test-Path $ngrokConfigPath) {
    Write-Host "[OK] ngrok configuration found" -ForegroundColor Green
} else {
    Write-Host @"
[WARNING] ngrok configuration not found!

You need to configure your authtoken:
1. Sign up at: https://dashboard.ngrok.com/signup
2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
3. Run: ngrok config add-authtoken YOUR_TOKEN_HERE

"@ -ForegroundColor Yellow

    $response = Read-Host "Do you have an ngrok authtoken? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        $authtoken = Read-Host "Enter your ngrok authtoken"
        Write-Host "`nConfiguring ngrok..." -ForegroundColor Yellow
        & ngrok config add-authtoken $authtoken
        Write-Host "[OK] ngrok configured!" -ForegroundColor Green
    } else {
        Write-Host "`nPlease get an authtoken and run this script again." -ForegroundColor Red
        Start-Process "https://dashboard.ngrok.com/signup"
        exit 1
    }
}

# Check if backend is running
Write-Host "`nChecking if backend is running on port $Port..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/v1/whatsapp/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[OK] Backend is running!" -ForegroundColor Green
} catch {
    Write-Host @"
[WARNING] Backend is not running on port $Port

Please start your backend first:
  cd Backend
  npm run dev

Then run this script again.
"@ -ForegroundColor Yellow

    $response = Read-Host "`nStart ngrok anyway? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        exit 0
    }
}

# Load environment variables
Write-Host "`nLoading environment configuration..." -ForegroundColor Yellow

$envPath = "C:\whatsapp-saas-starter\Backend\.env"
$verifyToken = "dev-webhook-verify-token"  # Default

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match '^WHATSAPP_VERIFY_TOKEN=(.+)$') {
            $verifyToken = $matches[1]
            break
        }
    }
    Write-Host "[OK] Environment loaded" -ForegroundColor Green
    Write-Host "    Verify Token: $verifyToken" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] .env file not found, using default verify token" -ForegroundColor Yellow
}

# Start ngrok
Write-Host @"

========================================
Starting ngrok tunnel...
========================================
Port:   $Port
Region: $Region

Press Ctrl+C to stop ngrok
========================================

"@ -ForegroundColor Cyan

Write-Host "Launching ngrok..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

# Start ngrok and capture output
$ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http", $Port, "--region", $Region -PassThru -NoNewWindow

Start-Sleep -Seconds 3

# Get ngrok API data
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $tunnel = $ngrokApi.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1

    if ($tunnel) {
        $publicUrl = $tunnel.public_url
        $webhookUrl = "$publicUrl/api/v1/whatsapp/webhook"

        Write-Host @"

========================================
ngrok Tunnel Active!
========================================

Public URL:     $publicUrl
Webhook URL:    $webhookUrl

ngrok Dashboard: http://localhost:4040
Backend Health:  http://localhost:$Port/api/v1/whatsapp/health

========================================
Next Steps:
========================================

1. COPY the Webhook URL above

2. CONFIGURE Meta Developer Console:
   a. Go to: https://developers.facebook.com/apps/
   b. Select your WhatsApp app
   c. Click 'WhatsApp' > 'Configuration'
   d. Edit Webhook URL

3. ENTER these values:
   Callback URL:  $webhookUrl
   Verify Token:  $verifyToken

4. CLICK 'Verify and Save'

5. SUBSCRIBE to events:
   - messages
   - message_status

========================================
Testing:
========================================

Test verification:
  curl "$webhookUrl?hub.mode=subscribe&hub.verify_token=$verifyToken&hub.challenge=test123"

Expected: test123

Monitor requests:
  http://localhost:4040

========================================
Documentation:
========================================

Full guide: C:\whatsapp-saas-starter\docs\NGROK_WEBHOOK_SETUP.md

========================================
Keep this terminal open!
Press Ctrl+C to stop ngrok
========================================

"@ -ForegroundColor Green

        # Copy webhook URL to clipboard
        try {
            Set-Clipboard -Value $webhookUrl
            Write-Host "[OK] Webhook URL copied to clipboard!" -ForegroundColor Cyan
        } catch {
            # Clipboard may not be available in some environments
        }

        # Open ngrok dashboard
        Start-Sleep -Seconds 2
        Start-Process "http://localhost:4040"

        # Open Meta Developer Console
        $response = Read-Host "`nOpen Meta Developer Console in browser? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Start-Process "https://developers.facebook.com/apps/"
        }

        # Keep script running
        Write-Host "`nngrok is running. Press Ctrl+C to stop." -ForegroundColor Yellow
        Wait-Process -Id $ngrokProcess.Id

    } else {
        Write-Host "[ERROR] Could not retrieve ngrok tunnel information" -ForegroundColor Red
        Write-Host "Check ngrok dashboard at: http://localhost:4040" -ForegroundColor Yellow
    }

} catch {
    Write-Host @"
[ERROR] Could not connect to ngrok API

ngrok may still be running. Check:
  http://localhost:4040

Error: $_
"@ -ForegroundColor Red
}
