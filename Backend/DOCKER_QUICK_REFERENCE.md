# Docker Quick Reference Card

**WhatsApp SaaS Platform - Essential Docker Commands**

---

## Quick Start

### Development
```bash
# Linux/macOS
./scripts/docker/dev-start.sh

# Windows
.\scripts\docker\dev-start.ps1
```

### Production
```bash
# Linux/macOS
./scripts/docker/prod-start.sh

# Windows
.\scripts\docker\prod-start.ps1
```

---

## Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart backend

# View service status
docker-compose ps

# Scale service
docker-compose up -d --scale backend=3
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00 backend
```

### Shell Access

```bash
# Backend container
docker-compose exec backend sh

# PostgreSQL container
docker-compose exec postgres sh

# Redis container
docker-compose exec redis sh

# Run as root (if needed)
docker-compose exec -u root backend sh
```

### Database

```bash
# Run migrations (development)
docker-compose exec backend npx prisma migrate dev

# Run migrations (production)
docker-compose exec backend npx prisma migrate deploy

# Prisma Studio
docker-compose exec backend npx prisma studio

# PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d whatsapp_saas

# Database backup
./scripts/docker/backup.sh dev
./scripts/docker/backup.sh prod

# Manual backup
docker-compose exec postgres pg_dump -U postgres whatsapp_saas > backup.sql

# Restore backup
cat backup.sql | docker-compose exec -T postgres psql -U postgres whatsapp_saas
```

### Testing

```bash
# Run all tests
docker-compose exec backend npm test

# Run tests with coverage
docker-compose exec backend npm run test:cov

# Run specific test
docker-compose exec backend npm test -- auth.service.spec.ts

# Run e2e tests
docker-compose exec backend npm run test:e2e
```

### Maintenance

```bash
# View resource usage
docker stats

# View disk usage
docker system df
docker system df -v

# Clean up
docker system prune              # Remove unused data
docker system prune -a           # Remove all unused images
docker volume prune              # Remove unused volumes
docker image prune -a            # Remove unused images

# Remove specific volume
docker volume rm whatsapp_saas_postgres_data
```

### Health Checks

```bash
# Check service health
docker-compose ps

# Test health endpoint
curl http://localhost:3000/api/v1/health

# Check container health
docker inspect --format='{{.State.Health.Status}}' whatsapp-saas-backend
```

---

## Production Commands

### Using Production Compose File

```bash
# Start production
docker-compose -f docker-compose.prod.yml up -d

# Stop production
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### SSL/TLS

```bash
# Generate self-signed certificate (testing only)
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Test Nginx config
docker-compose exec nginx nginx -t

# Reload Nginx
docker-compose exec nginx nginx -s reload

# View certificate info
openssl x509 -in ssl/cert.pem -text -noout
```

---

## Troubleshooting

### Debug Container

```bash
# View environment variables
docker-compose exec backend env

# Check file permissions
docker-compose exec backend ls -la /app

# View running processes
docker-compose exec backend ps aux

# Check network connectivity
docker-compose exec backend ping postgres
docker-compose exec backend ping redis
```

### Database Issues

```bash
# Check PostgreSQL is ready
docker-compose exec postgres pg_isready

# View database connections
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Check database size
docker-compose exec postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('whatsapp_saas'));"
```

### Redis Issues

```bash
# Check Redis connectivity
docker-compose exec redis redis-cli ping

# View Redis info
docker-compose exec redis redis-cli info

# Monitor Redis
docker-compose exec redis redis-cli monitor

# Check memory usage
docker-compose exec redis redis-cli info memory
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect whatsapp_saas_network

# Check container IP
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' whatsapp-saas-backend
```

### Port Issues

```bash
# Check if port is in use (Linux/macOS)
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Check if port is in use (Windows)
netstat -ano | findstr :3000
```

---

## Build and Deploy

### Image Management

```bash
# Build image
docker build -t whatsapp-saas-backend:latest .

# Build with BuildKit
DOCKER_BUILDKIT=1 docker build -t whatsapp-saas-backend:latest .

# Tag image
docker tag whatsapp-saas-backend:latest whatsapp-saas-backend:1.0.0

# Push to registry
docker push your-registry/whatsapp-saas-backend:latest

# Pull from registry
docker pull your-registry/whatsapp-saas-backend:latest
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect whatsapp_saas_postgres_data

# View volume contents
docker run --rm -v whatsapp_saas_postgres_data:/data alpine ls -la /data

# Backup volume
docker run --rm -v whatsapp_saas_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/volume-backup.tar.gz /data

# Restore volume
docker run --rm -v whatsapp_saas_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/volume-backup.tar.gz -C /
```

---

## Performance Monitoring

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats whatsapp-saas-backend

# Format output
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Logs Analysis

```bash
# Count errors
docker-compose logs backend | grep ERROR | wc -l

# Find slow queries
docker-compose logs postgres | grep "duration:"

# View latest errors
docker-compose logs backend | grep ERROR | tail -20
```

---

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Docker Compose aliases
alias dc='docker-compose'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
alias dcp='docker-compose ps'
alias dcr='docker-compose restart'

# Production aliases
alias dcp-prod='docker-compose -f docker-compose.prod.yml'
alias dcu-prod='docker-compose -f docker-compose.prod.yml up -d'
alias dcd-prod='docker-compose -f docker-compose.prod.yml down'
alias dcl-prod='docker-compose -f docker-compose.prod.yml logs -f'

# Backend aliases
alias backend-sh='docker-compose exec backend sh'
alias backend-logs='docker-compose logs -f backend'
alias backend-test='docker-compose exec backend npm test'

# Database aliases
alias db-cli='docker-compose exec postgres psql -U postgres -d whatsapp_saas'
alias db-backup='./scripts/docker/backup.sh'
alias prisma-studio='docker-compose exec backend npx prisma studio'
```

---

## Environment Files

### Development (.env)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/whatsapp_saas?schema=public
REDIS_URL=redis://redis:6379
```

### Production (.env)
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@postgres:5432/whatsapp_saas?schema=public
REDIS_URL=redis://:STRONG_PASSWORD@redis:6379
POSTGRES_PASSWORD=STRONG_PASSWORD
REDIS_PASSWORD=STRONG_PASSWORD
JWT_SECRET=RANDOM_SECRET
ADMIN_TOKEN=RANDOM_TOKEN
```

---

## Common Issues & Solutions

### Issue: Port already in use
```bash
# Find and kill process
sudo lsof -i :3000
kill -9 <PID>

# Or change port
PORT=3001 docker-compose up -d
```

### Issue: Permission denied
```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./logs ./data ./uploads

# Or run as root
docker-compose exec -u root backend chown -R nodejs:nodejs /app/logs
```

### Issue: Database connection error
```bash
# Check PostgreSQL health
docker-compose exec postgres pg_isready

# Verify connection string
docker-compose exec backend env | grep DATABASE_URL

# Restart PostgreSQL
docker-compose restart postgres
```

### Issue: Out of disk space
```bash
# Clean everything
docker system prune -a -f
docker volume prune -f

# Check space
docker system df
```

### Issue: Container keeps restarting
```bash
# Check logs
docker-compose logs backend

# Disable restart temporarily
docker update --restart=no whatsapp-saas-backend

# Inspect container
docker inspect whatsapp-saas-backend
```

---

## Quick Health Check Checklist

```bash
# 1. Check all services are running
docker-compose ps

# 2. Check health endpoint
curl http://localhost:3000/api/v1/health

# 3. Check database
docker-compose exec postgres pg_isready

# 4. Check Redis
docker-compose exec redis redis-cli ping

# 5. Check logs for errors
docker-compose logs --tail=50 backend | grep ERROR

# 6. Check resource usage
docker stats --no-stream

# 7. Check disk space
docker system df
```

---

## URLs (Development)

- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api/docs
- **Health Check:** http://localhost:3000/api/v1/health
- **Adminer:** http://localhost:8080 (with `--profile tools`)
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## URLs (Production)

- **HTTPS:** https://yourdomain.com
- **HTTP (redirect):** http://yourdomain.com
- **Health Check:** https://yourdomain.com/health
- **API:** https://yourdomain.com/api/v1

---

**For detailed documentation, see DOCKER.md**

**Last Updated:** 2024-10-21
