# WhatsApp SaaS Platform - Quick Start Guide

Get up and running in 5 minutes!

---

## Option 1: Docker Compose (Fastest - Recommended)

**Prerequisites**: Docker and Docker Compose installed

```bash
# Clone repository
git clone <repository-url>
cd whatsapp-saas-starter

# Start entire stack (PostgreSQL + Redis + Backend + Frontend)
docker-compose -f docker-compose.dev.yml up

# Wait for services to start, then access:
# - Frontend: http://localhost:3001
# - Backend: http://localhost:4000
# - pgAdmin: http://localhost:5050
```

That's it! Everything is running.

---

## Option 2: Automated Local Development

**Prerequisites**: Node.js 18+ and npm 9+

```bash
# Clone repository
git clone <repository-url>
cd whatsapp-saas-starter

# Setup Backend
cd Backend
cp .env.example .env
npm install

# Setup Frontend
cd ../Frontend
cp .env.local.example .env.local
npm install

# Start both backend and frontend automatically
npm run dev:full

# Access:
# - Frontend: http://localhost:3001
# - Backend: http://localhost:4000
```

---

## Option 3: Manual Setup

**Prerequisites**: Node.js 18+, PostgreSQL 15+, Redis 7+

### Step 1: Database Setup

```bash
# Create database
createdb whatsapp_saas

# Or using psql
psql -U postgres -c "CREATE DATABASE whatsapp_saas;"
```

### Step 2: Backend Setup

```bash
cd Backend
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas

npm install
npm run migrate
npm run dev
```

Backend running at http://localhost:4000

### Step 3: Frontend Setup (New Terminal)

```bash
cd Frontend
cp .env.local.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000

npm install
npm run dev
```

Frontend running at http://localhost:3001

---

## Verify Installation

### Check Backend Health

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Check Frontend

Open browser: http://localhost:3001

You should see the WhatsApp SaaS Platform dashboard.

---

## Common Commands

### Docker Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Reset everything (caution: deletes data)
docker-compose -f docker-compose.dev.yml down -v
```

### Development Commands

```bash
# Frontend
cd Frontend
npm run dev              # Start frontend only
npm run dev:full         # Start backend + frontend
npm run verify-backend   # Check backend connection
npm run build            # Production build
npm test                 # Run tests

# Backend
cd Backend
npm run dev              # Start development server
npm run migrate          # Run database migrations
npm run seed             # Seed sample data
npm test                 # Run tests
```

---

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=WhatsApp SaaS Platform
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production
```

---

## Troubleshooting

### Port Already in Use

**Backend (port 4000)**:
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :4000
kill -9 <PID>
```

**Frontend (port 3001)**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### Backend Connection Failed

1. Check backend is running: `curl http://localhost:4000/api/health`
2. Check NEXT_PUBLIC_API_URL in Frontend/.env.local
3. Run backend verification: `cd Frontend && npm run verify-backend`

### Database Connection Failed

1. Check PostgreSQL is running
2. Verify DATABASE_URL in Backend/.env
3. Test connection: `psql -h localhost -U postgres -d whatsapp_saas`

### Docker Issues

```bash
# View service logs
docker-compose -f docker-compose.dev.yml logs <service-name>

# Rebuild containers
docker-compose -f docker-compose.dev.yml build --no-cache

# Complete reset
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

---

## Next Steps

1. Read [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) for detailed guide
2. Check [Backend/README.md](Backend/README.md) for API documentation
3. Review [Frontend/README.md](Frontend/README.md) for component guide
4. See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for architecture
5. Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

---

## Getting Help

- Documentation: Check the `/docs` folder
- Issues: Create a GitHub issue
- Questions: Start a GitHub discussion

---

## Default Credentials (Development)

**Database**:
- Host: localhost
- Port: 5432
- Database: whatsapp_saas
- Username: postgres
- Password: postgres

**pgAdmin** (Docker only):
- URL: http://localhost:5050
- Email: admin@whatsapp-saas.local
- Password: admin

**Redis**:
- Host: localhost
- Port: 6379
- No password (development)

---

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3001 | http://localhost:3001 |
| Backend | 4000 | http://localhost:4000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| pgAdmin | 5050 | http://localhost:5050 |

---

Happy coding!
