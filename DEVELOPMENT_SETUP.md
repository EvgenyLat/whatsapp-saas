# WhatsApp SaaS Platform - Development Setup Guide

This guide will help you set up the WhatsApp SaaS Platform for local development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Manual Setup](#manual-setup)
4. [Environment Variables](#environment-variables)
5. [Development Workflow](#development-workflow)
6. [Database Management](#database-management)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker**: v20.10 or higher (optional, for containerized development)
- **Docker Compose**: v2.0 or higher (optional)
- **PostgreSQL**: v15 or higher (if not using Docker)
- **Redis**: v7 or higher (if not using Docker)

### Verify Installation

```bash
node --version   # Should be >= 18.0.0
npm --version    # Should be >= 9.0.0
docker --version # Optional
```

---

## Quick Start

### Option 1: Docker Compose (Recommended)

Start the entire stack with one command:

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose -f docker-compose.dev.yml up

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

**Services will be available at:**

- Frontend: http://localhost:3001
- Backend API: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin: http://localhost:5050 (admin@whatsapp-saas.local / admin)

### Option 2: Automated Local Development

Run both backend and frontend with automatic backend verification:

```bash
cd Frontend
npm run dev:full
```

This script will:
1. Start the backend server
2. Verify backend health
3. Start the frontend development server
4. Handle graceful shutdown on Ctrl+C

### Option 3: Manual Setup

See [Manual Setup](#manual-setup) section below.

---

## Manual Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd whatsapp-saas-starter
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd Backend
npm install
```

#### Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# See Environment Variables section below
```

#### Database Setup

```bash
# Create database
createdb whatsapp_saas

# Or using PostgreSQL CLI
psql -U postgres -c "CREATE DATABASE whatsapp_saas;"

# Run migrations
npm run migrate

# Seed database with sample data (optional)
npm run seed
```

#### Start Backend

```bash
npm run dev
```

Backend will start at http://localhost:4000

#### Verify Backend

```bash
curl http://localhost:4000/api/health
```

### 3. Frontend Setup

#### Install Dependencies

```bash
cd Frontend
npm install
```

#### Configure Environment Variables

```bash
# Copy example environment file
cp .env.local.example .env.local

# Edit .env.local with your configuration
```

#### Start Frontend

```bash
npm run dev
```

Frontend will start at http://localhost:3001

#### Verify Backend Connection

```bash
npm run verify-backend
```

---

## Environment Variables

### Backend (.env)

```bash
# Server Configuration
NODE_ENV=development
PORT=4000

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# WhatsApp API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id

# AWS Configuration (for production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=whatsapp-saas-uploads

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@whatsapp-saas.com

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=debug
```

### Frontend (.env.local)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# App Configuration
NEXT_PUBLIC_APP_NAME=WhatsApp SaaS Platform
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=false

# Authentication
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production
```

---

## Development Workflow

### Daily Development

1. **Start Development Environment**

```bash
# Option 1: Docker Compose
docker-compose -f docker-compose.dev.yml up

# Option 2: Automated local
cd Frontend && npm run dev:full

# Option 3: Manual (in separate terminals)
cd Backend && npm run dev
cd Frontend && npm run dev
```

2. **Make Changes**

- Edit code in your favorite IDE
- Changes will hot-reload automatically

3. **Run Tests**

```bash
# Backend tests
cd Backend
npm test
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage

# Frontend tests
cd Frontend
npm test
npm run test:watch
npm run test:coverage
```

4. **Code Quality Checks**

```bash
# Backend
cd Backend
npm run lint
npm run format
npm run type-check

# Frontend
cd Frontend
npm run quality-check  # Runs all checks
npm run lint:fix
npm run format
```

### Creating New Features

1. **Create Feature Branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Develop Feature**

- Write code
- Write tests
- Update documentation

3. **Run Quality Checks**

```bash
# Backend
cd Backend && npm run quality-check

# Frontend
cd Frontend && npm run quality-check
```

4. **Commit Changes**

```bash
git add .
git commit -m "feat: add your feature description"
```

5. **Push and Create Pull Request**

```bash
git push origin feature/your-feature-name
```

---

## Database Management

### Using pgAdmin (Docker Setup)

1. Access pgAdmin at http://localhost:5050
2. Login with credentials:
   - Email: admin@whatsapp-saas.local
   - Password: admin
3. Add new server:
   - Host: postgres (if in Docker network) or localhost
   - Port: 5432
   - Database: whatsapp_saas
   - Username: postgres
   - Password: postgres

### Using psql CLI

```bash
# Connect to database
psql -h localhost -U postgres -d whatsapp_saas

# List tables
\dt

# Describe table
\d tenants

# Run query
SELECT * FROM tenants;

# Exit
\q
```

### Database Migrations

```bash
cd Backend

# Create new migration
npm run migrate:create -- create_new_table

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Reset database (caution: destroys all data)
npm run migrate:reset
```

### Database Seeding

```bash
cd Backend

# Seed database with sample data
npm run seed

# Seed specific seeder
npm run seed:run -- --specific=tenants
```

---

## Testing

### Backend Testing

```bash
cd Backend

# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Frontend Testing

```bash
cd Frontend

# Component tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode (no watch)
npm run test:ci
```

### API Testing with curl

```bash
# Health check
curl http://localhost:4000/api/health

# Register tenant
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "businessName": "Test Business",
    "phoneNumber": "+1234567890"
  }'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

---

## Troubleshooting

### Backend Won't Start

**Issue**: Port 4000 already in use

```bash
# Find process using port 4000
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :4000
kill -9 <PID>
```

**Issue**: Database connection failed

```bash
# Verify PostgreSQL is running
# Docker
docker-compose -f docker-compose.dev.yml ps

# Local
pg_isadmin

# Check connection
psql -h localhost -U postgres -d whatsapp_saas

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**Issue**: Redis connection failed

```bash
# Verify Redis is running
# Docker
docker-compose -f docker-compose.dev.yml ps

# Local
redis-cli ping  # Should return PONG

# Check connection
redis-cli -h localhost -p 6379
```

### Frontend Won't Start

**Issue**: Port 3001 already in use

```bash
# Find and kill process
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

**Issue**: Backend verification fails

```bash
# Verify backend is running
curl http://localhost:4000/api/health

# Check NEXT_PUBLIC_API_URL in .env.local
cat Frontend/.env.local | grep NEXT_PUBLIC_API_URL

# Run verification manually
cd Frontend
npm run verify-backend
```

**Issue**: Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Docker Issues

**Issue**: Container fails to start

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs <service-name>

# Rebuild containers
docker-compose -f docker-compose.dev.yml build --no-cache

# Reset everything
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

**Issue**: Volume permission errors

```bash
# Linux/Mac: Fix permissions
sudo chown -R $USER:$USER .

# Or run with root
docker-compose -f docker-compose.dev.yml up --user root
```

### Database Issues

**Issue**: Migration fails

```bash
# Check migration status
cd Backend
npm run migrate:status

# Rollback and retry
npm run migrate:rollback
npm run migrate

# Reset database (caution: destroys data)
npm run migrate:reset
npm run migrate
```

**Issue**: Connection pool exhausted

```bash
# Check active connections
psql -h localhost -U postgres -d whatsapp_saas -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname = 'whatsapp_saas';"

# Increase pool size in Backend/.env
DB_POOL_MAX=20

# Restart backend
```

### Performance Issues

**Issue**: Slow response times

```bash
# Enable debug logging
# Backend/.env
LOG_LEVEL=debug

# Check database query performance
# See Backend/docs/PERFORMANCE.md

# Monitor Redis performance
redis-cli --stat
```

**Issue**: Memory leaks

```bash
# Monitor memory usage
# Backend
NODE_ENV=development node --inspect Backend/src/server.js

# Frontend
npm run dev -- --turbo
```

---

## Additional Resources

- **Backend API Documentation**: [Backend/README.md](Backend/README.md)
- **Frontend Documentation**: [Frontend/README.md](Frontend/README.md)
- **API Reference**: [Backend/docs/API.md](Backend/docs/API.md)
- **Architecture Guide**: [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
- **Production Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Security Guide**: [SECURITY_IMPLEMENTATION_README.md](SECURITY_IMPLEMENTATION_README.md)

---

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check docs folder for detailed guides

---

## Development Tips

### Hot Reload

Both backend and frontend support hot reloading:

- **Backend**: Uses nodemon to restart on file changes
- **Frontend**: Next.js Fast Refresh automatically updates UI

### Debugging

**Backend (VS Code)**

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/Backend/src/server.js",
  "envFile": "${workspaceFolder}/Backend/.env"
}
```

**Frontend (VS Code)**

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Debug Frontend",
  "url": "http://localhost:3001",
  "webRoot": "${workspaceFolder}/Frontend"
}
```

### Database GUI Tools

- **pgAdmin**: http://localhost:5050 (Docker setup)
- **DBeaver**: Free universal database tool
- **TablePlus**: macOS/Windows database client
- **Postico**: macOS PostgreSQL client

### Redis GUI Tools

- **RedisInsight**: Official Redis GUI
- **Medis**: macOS Redis client
- **Redis Commander**: Web-based Redis management

---

## Next Steps

1. Explore the codebase
2. Run the test suite
3. Check out the API documentation
4. Review the architecture guide
5. Start building features!

Happy coding!
