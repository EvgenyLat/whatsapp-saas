# Quick Start: Database Setup

## Option 1: Automated Setup (Recommended)

### PowerShell (Windows)
```powershell
cd C:\whatsapp-saas-starter\backend
.\scripts\setup-database.ps1
```

### With Management Tools
```powershell
.\scripts\setup-database.ps1 -WithTools
```

### Reset Database
```powershell
.\scripts\setup-database.ps1 -Reset
```

---

## Option 2: Manual Setup

### Step 1: Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Verify: `docker --version`

### Step 2: Start Database
```bash
cd C:\whatsapp-saas-starter\backend
docker-compose -f docker-compose.db.yml up -d
```

### Step 3: Run Migrations
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### Step 4: Verify
```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## Option 3: Without Docker

### Step 1: Install PostgreSQL
Download from: https://www.postgresql.org/download/windows/

### Step 2: Create Database
```bash
psql -U postgres
CREATE DATABASE whatsapp_saas;
\q
```

### Step 3: Update .env.development
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas?schema=public
```

### Step 4: Run Migrations
```bash
cd C:\whatsapp-saas-starter\backend
npx prisma generate
npx prisma migrate dev --name init
```

---

## Verify Installation

### Check Tables
```bash
npx prisma studio
```

### Or use psql
```bash
# With Docker:
docker exec -it whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas

# Without Docker:
psql -U postgres -d whatsapp_saas

# Then:
\dt
```

Expected tables:
- salons
- bookings
- messages
- templates
- conversations
- webhook_logs
- ai_conversations
- ai_messages

---

## Troubleshooting

### Port 5432 already in use?
```powershell
# Check what's using the port
netstat -ano | findstr :5432

# Kill the process or change port in docker-compose.db.yml
```

### Docker not starting?
1. Open Docker Desktop
2. Wait for "Docker Desktop is running"
3. Try again

### Prisma errors?
```bash
# Clear and regenerate
rm -rf node_modules/.prisma
npx prisma generate --force
```

---

## Quick Commands

```bash
# Start database
docker-compose -f docker-compose.db.yml up -d

# Stop database
docker-compose -f docker-compose.db.yml down

# View logs
docker logs -f whatsapp-saas-postgres-dev

# Open Prisma Studio
npx prisma studio

# Reset database (deletes all data)
npx prisma migrate reset
```

---

## Next Steps

1. Start backend: `npm run dev`
2. Test authentication endpoints
3. Set up monitoring
4. Configure backups

For detailed documentation, see: [DATABASE_SETUP.md](./DATABASE_SETUP.md)
