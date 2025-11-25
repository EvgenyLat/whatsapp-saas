# Docker Desktop Installation Guide for Windows

## Quick Install Steps

### 1. Download Docker Desktop

Visit: **https://www.docker.com/products/docker-desktop/**

Or direct download: **https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe**

**File Size**: ~500 MB
**Requirements**: Windows 10/11 (64-bit)

---

### 2. System Requirements

Before installing, verify your system meets these requirements:

- **Windows 10/11** (64-bit): Pro, Enterprise, or Education (Build 19041 or higher)
- **Hardware**:
  - 4GB RAM minimum (8GB recommended)
  - BIOS-level hardware virtualization support must be enabled
- **WSL 2**: Will be installed automatically

---

### 3. Installation Steps

#### Step 3.1: Run Installer

1. Double-click `Docker Desktop Installer.exe`
2. If prompted, ensure "Use WSL 2 instead of Hyper-V" is checked
3. Click "OK" to proceed with installation
4. Wait for installation to complete (5-10 minutes)

#### Step 3.2: Enable WSL 2 (if not enabled)

Docker Desktop will prompt you to enable WSL 2. If needed:

```powershell
# Run PowerShell as Administrator
wsl --install
```

**Note**: You may need to restart your computer.

#### Step 3.3: Start Docker Desktop

1. Launch "Docker Desktop" from Start Menu
2. Wait for Docker Engine to start (green icon in system tray)
3. You may need to accept the service agreement

---

### 4. Verify Installation

Open PowerShell or Command Prompt and run:

```powershell
docker --version
```

Expected output:
```
Docker version 24.0.x, build xxxxxxx
```

```powershell
docker-compose --version
```

Expected output:
```
Docker Compose version v2.x.x
```

Test Docker is running:
```powershell
docker run hello-world
```

You should see: "Hello from Docker!" message.

---

### 5. Configure Docker Desktop

#### Recommended Settings

1. Open Docker Desktop
2. Click Settings (gear icon)

**Resources > Advanced**:
- CPUs: 2-4 (depending on your system)
- Memory: 4-8 GB
- Swap: 1-2 GB
- Disk image size: 64 GB (or more)

**General**:
- ✓ Start Docker Desktop when you log in
- ✓ Use Docker Compose V2

**Apply & Restart** to save changes.

---

### 6. Next Steps: Run Database Setup

Once Docker is installed and running, proceed with database setup:

#### Option 1: Automated Setup (Recommended)

```powershell
cd C:\whatsapp-saas-starter\backend
.\scripts\setup-database.ps1
```

#### Option 2: Manual Setup

```powershell
cd C:\whatsapp-saas-starter\backend

# Start database services
docker-compose -f docker-compose.db.yml up -d

# Wait for services to be ready (check with)
docker ps

# Run Prisma migrations
npx prisma generate
npx prisma migrate dev --name init

# Verify
npx prisma studio
```

---

### 7. Troubleshooting

#### Issue: "WSL 2 installation is incomplete"

**Solution**:
```powershell
# Run as Administrator
wsl --update
wsl --set-default-version 2
```

Restart your computer and start Docker Desktop again.

#### Issue: "Docker Desktop failed to start"

**Solutions**:
1. Restart Docker Desktop
2. Restart your computer
3. Check if Hyper-V or WSL 2 is enabled:
   ```powershell
   # Check Windows features
   Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
   Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
   ```

#### Issue: "Hardware assisted virtualization is not enabled"

**Solution**:
1. Restart computer and enter BIOS/UEFI settings (usually F2, F10, or Del during boot)
2. Look for "Virtualization Technology" (Intel VT-x) or "SVM Mode" (AMD-V)
3. Enable it
4. Save and exit BIOS

#### Issue: Port 5432 already in use

**Solution**:
```powershell
# Find what's using the port
netstat -ano | findstr :5432

# Stop the process or change Docker port
# Edit docker-compose.db.yml:
# ports:
#   - "5433:5432"  # Use different host port

# Then update DATABASE_URL in .env.development:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/whatsapp_saas?schema=public
```

---

### 8. Alternative: Manual PostgreSQL Installation

If Docker Desktop doesn't work, you can install PostgreSQL directly:

#### Download PostgreSQL 16

Visit: **https://www.postgresql.org/download/windows/**

Or direct: **https://www.enterprisedb.com/downloads/postgres-postgresql-downloads**

#### Install PostgreSQL

1. Run the installer
2. Set password: `postgres`
3. Port: `5432`
4. Locale: Default
5. Complete installation

#### Create Database

```powershell
# Open Command Prompt
cd "C:\Program Files\PostgreSQL\16\bin"

# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE whatsapp_saas;

# Verify
\l

# Exit
\q
```

#### Update Environment

Your `.env.development` is already configured correctly:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas?schema=public
```

#### Run Migrations

```powershell
cd C:\whatsapp-saas-starter\backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma studio
```

---

### 9. Quick Reference

#### Start Docker Services
```powershell
docker-compose -f docker-compose.db.yml up -d
```

#### Stop Docker Services
```powershell
docker-compose -f docker-compose.db.yml down
```

#### View Logs
```powershell
docker logs -f whatsapp-saas-postgres-dev
```

#### Restart Docker
```powershell
docker restart whatsapp-saas-postgres-dev
```

#### Connect to Database
```powershell
docker exec -it whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas
```

---

### 10. Support Resources

- **Docker Documentation**: https://docs.docker.com/desktop/install/windows-install/
- **WSL 2 Setup**: https://docs.microsoft.com/en-us/windows/wsl/install
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/16/
- **Project Setup Guide**: See `DATABASE_SETUP.md` for complete documentation

---

**Estimated Time**: 30-45 minutes (including download time)

**Next**: Once Docker is running, execute `.\scripts\setup-database.ps1` to complete database setup.
