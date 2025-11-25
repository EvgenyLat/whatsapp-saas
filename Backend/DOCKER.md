# Docker Deployment Guide

Complete guide for deploying the WhatsApp SaaS Platform using Docker.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Database Management](#database-management)
- [Monitoring and Logs](#monitoring-and-logs)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [Commands Reference](#commands-reference)

---

## Quick Start

### Development Environment

**Linux/macOS:**
```bash
# Start development environment
./scripts/docker/dev-start.sh

# With database management UI
./scripts/docker/dev-start.sh --tools

# Rebuild containers
./scripts/docker/dev-start.sh --build
```

**Windows (PowerShell):**
```powershell
# Start development environment
.\scripts\docker\dev-start.ps1

# With database management UI
.\scripts\docker\dev-start.ps1 -Tools

# Rebuild containers
.\scripts\docker\dev-start.ps1 -Build
```

Access the application:
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/api/v1/health
- Adminer (if started with --tools): http://localhost:8080

### Production Environment

```bash
# Linux/macOS
./scripts/docker/prod-start.sh

# Windows (PowerShell)
.\scripts\docker\prod-start.ps1
```

---

## Architecture

### Services

The Docker setup includes the following services:

1. **Backend** (NestJS Application)
   - Node.js 20 Alpine
   - Multi-stage build for optimization
   - Non-root user for security
   - Health checks enabled
   - Resource limits configured

2. **PostgreSQL 16** (Database)
   - Alpine-based image
   - Performance tuning applied
   - Persistent volumes
   - Automated backups ready
   - Health checks enabled

3. **Redis 7** (Cache & Queue)
   - Alpine-based image
   - AOF persistence enabled
   - Memory limits configured
   - Health checks enabled

4. **Nginx** (Production only)
   - Reverse proxy
   - SSL/TLS termination
   - Rate limiting
   - Gzip compression
   - Security headers

5. **Adminer** (Development only, optional)
   - Database management UI
   - Access via profile flag

### Network Architecture

```
                    ┌─────────────────┐
                    │   Internet      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Nginx (443)    │
                    │  SSL/TLS        │
                    │  Rate Limiting  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Backend (3000) │
                    │  NestJS API     │
                    └────┬──────┬─────┘
                         │      │
              ┌──────────▼┐    ┌▼────────────┐
              │ PostgreSQL│    │   Redis     │
              │   (5432)  │    │   (6379)    │
              └───────────┘    └─────────────┘
```

### Volume Structure

**Development:**
- `whatsapp_saas_postgres_data` - Database data
- `whatsapp_saas_redis_data` - Redis data
- `whatsapp_saas_node_modules` - Node.js dependencies
- `./logs` - Application logs (host mount)
- `./data` - Application data (host mount)

**Production:**
- `whatsapp_saas_postgres_data_prod` - Database data
- `whatsapp_saas_postgres_backups` - Database backups
- `whatsapp_saas_redis_data_prod` - Redis data
- `whatsapp_saas_backend_logs` - Application logs
- `whatsapp_saas_backend_data` - Application data
- `whatsapp_saas_backend_uploads` - User uploads
- `whatsapp_saas_nginx_cache` - Nginx cache
- `whatsapp_saas_nginx_logs` - Nginx logs

---

## Development Setup

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Git
- 4GB RAM minimum
- 10GB free disk space

### Initial Setup

1. **Clone the repository:**
   ```bash
   cd backend
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit .env with your credentials:**
   ```bash
   # Required for development
   ADMIN_TOKEN=your-admin-token
   META_VERIFY_TOKEN=your-meta-verify-token
   META_APP_SECRET=your-meta-app-secret
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   WHATSAPP_ACCESS_TOKEN=your-access-token
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Start the development environment:**
   ```bash
   ./scripts/docker/dev-start.sh
   ```

### Development Workflow

**View logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

**Run database migrations:**
```bash
docker-compose exec backend npx prisma migrate dev
```

**Run tests:**
```bash
docker-compose exec backend npm test
docker-compose exec backend npm run test:cov
```

**Access container shell:**
```bash
docker-compose exec backend sh
```

**Restart services:**
```bash
docker-compose restart backend
docker-compose restart postgres
```

**Stop environment:**
```bash
./scripts/docker/stop.sh dev
```

**Clean volumes (WARNING: deletes data):**
```bash
./scripts/docker/stop.sh dev --clean
```

### Hot Reload

The development setup includes volume mounts for hot-reload:
- `./src` → `/app/src` (read-only)
- `./prisma` → `/app/prisma` (read-only)

Changes to TypeScript files are automatically detected and the application restarts.

---

## Production Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- SSL/TLS certificates
- Production server (2GB RAM minimum, 4GB+ recommended)
- Domain name (for SSL/TLS)

### Pre-Deployment Checklist

- [ ] Production environment variables configured
- [ ] SSL certificates obtained and placed in `./ssl/`
- [ ] Domain DNS configured
- [ ] Firewall rules configured (ports 80, 443)
- [ ] Backup strategy planned
- [ ] Monitoring solution ready
- [ ] Strong passwords generated for all services
- [ ] JWT secrets generated (random, secure)

### SSL/TLS Certificate Setup

**Option 1: Let's Encrypt (Recommended)**

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate (standalone)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

**Option 2: Self-Signed (Testing Only)**

```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Production Environment File

```bash
# Create production environment file
cp .env.production.example .env
```

Edit `.env` with secure values:

```bash
# Database
POSTGRES_DB=whatsapp_saas
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_RANDOM_PASSWORD_HERE

# Redis
REDIS_PASSWORD=STRONG_RANDOM_PASSWORD_HERE

# JWT Secrets (generate random strings)
JWT_SECRET=RANDOM_SECRET_HERE
JWT_REFRESH_SECRET=RANDOM_REFRESH_SECRET_HERE

# Admin
ADMIN_TOKEN=RANDOM_ADMIN_TOKEN_HERE

# WhatsApp
META_VERIFY_TOKEN=your-meta-verify-token
META_APP_SECRET=your-meta-app-secret
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# CORS - Set to your actual domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Application
NODE_ENV=production
LOG_LEVEL=info
```

**Generate secure random secrets:**

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Admin Token
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Deploy to Production

1. **Update nginx.conf:**
   ```nginx
   # Replace server_name _ with your domain
   server_name yourdomain.com www.yourdomain.com;
   ```

2. **Start production environment:**
   ```bash
   ./scripts/docker/prod-start.sh
   ```

3. **Verify deployment:**
   ```bash
   # Check health
   curl https://yourdomain.com/health

   # Check API
   curl https://yourdomain.com/api/v1/health
   ```

4. **Monitor logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

### Production Updates

**Update application:**
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

**Rolling update (zero downtime):**
```bash
# Scale up
docker-compose -f docker-compose.prod.yml up -d --scale backend=2

# Wait for health checks
sleep 30

# Scale down old instance
docker-compose -f docker-compose.prod.yml up -d --scale backend=1
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection | `redis://:password@host:6379` |
| `ADMIN_TOKEN` | Admin API token | Generated random string |
| `JWT_SECRET` | JWT signing secret | Generated random string |
| `JWT_REFRESH_SECRET` | Refresh token secret | Generated random string |

### WhatsApp Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `META_VERIFY_TOKEN` | Webhook verification token | Yes |
| `META_APP_SECRET` | Facebook app secret | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID | Yes |
| `WHATSAPP_ACCESS_TOKEN` | Access token | Yes |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `info` |
| `ALLOWED_ORIGINS` | CORS origins | `*` |
| `DB_CONNECTION_LIMIT` | Max DB connections | `50` |
| `WEBHOOK_RATE_LIMIT` | Webhook rate limit | `100` |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_MODEL` | OpenAI model | `gpt-4` |

---

## Database Management

### Migrations

**Run migrations:**
```bash
# Development
docker-compose exec backend npx prisma migrate dev

# Production
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

**Create new migration:**
```bash
docker-compose exec backend npx prisma migrate dev --name description
```

**Reset database (DEV ONLY):**
```bash
docker-compose exec backend npx prisma migrate reset
```

### Backups

**Create backup:**
```bash
./scripts/docker/backup.sh dev    # Development
./scripts/docker/backup.sh prod   # Production
```

**Manual backup:**
```bash
docker-compose exec postgres pg_dump -U postgres whatsapp_saas > backup.sql
```

**Restore backup:**
```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres whatsapp_saas
```

**Automated backups (cron):**
```bash
# Add to crontab
0 2 * * * /path/to/backend/scripts/docker/backup.sh prod
```

### Database Access

**PostgreSQL CLI:**
```bash
docker-compose exec postgres psql -U postgres -d whatsapp_saas
```

**Prisma Studio:**
```bash
docker-compose exec backend npx prisma studio
# Access at http://localhost:5555
```

**Adminer (Development):**
```bash
docker-compose --profile tools up -d
# Access at http://localhost:8080
# Server: postgres, User: postgres, Password: postgres, Database: whatsapp_saas
```

---

## Monitoring and Logs

### View Logs

**All services:**
```bash
docker-compose logs -f
```

**Specific service:**
```bash
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f nginx  # Production only
```

**Last N lines:**
```bash
docker-compose logs --tail=100 backend
```

**Since timestamp:**
```bash
docker-compose logs --since 2024-01-01T00:00:00 backend
```

### Log Files

**Development:**
- Application: `./logs/application.log`
- Container: `docker logs whatsapp-saas-backend`

**Production:**
- Application: Named volume `whatsapp_saas_backend_logs`
- Nginx access: Named volume `whatsapp_saas_nginx_logs`
- Nginx error: Named volume `whatsapp_saas_nginx_logs`

**Access log volumes:**
```bash
docker run --rm -v whatsapp_saas_backend_logs:/logs alpine ls -la /logs
```

### Health Checks

**Check service health:**
```bash
docker-compose ps
```

**Manual health check:**
```bash
curl http://localhost:3000/api/v1/health
```

**Health check response:**
```json
{
  "status": "ok",
  "timestamp": "2024-10-21T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "memory": {
    "rss": "150MB",
    "heapTotal": "120MB",
    "heapUsed": "90MB",
    "external": "5MB"
  },
  "pid": 1
}
```

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats whatsapp-saas-backend
```

### Disk Usage

```bash
# Docker system info
docker system df

# Detailed volume info
docker system df -v

# Container sizes
docker ps -s
```

---

## Scaling

### Horizontal Scaling

**Scale backend instances:**
```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

**Update nginx for load balancing:**
```nginx
upstream backend {
    least_conn;
    server backend_1:3000;
    server backend_2:3000;
    server backend_3:3000;
}
```

### Vertical Scaling

**Adjust resource limits in docker-compose.prod.yml:**

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 4G
      reservations:
        cpus: '1.0'
        memory: 1G
```

### Database Scaling

**Connection pool tuning:**

```bash
# .env
DB_CONNECTION_LIMIT=100
DB_POOL_TIMEOUT=30
```

**PostgreSQL settings:**
```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=1GB"
```

---

## Troubleshooting

### Common Issues

**1. Container won't start**

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Inspect container
docker inspect whatsapp-saas-backend
```

**2. Database connection errors**

```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Check connection string
docker-compose exec backend env | grep DATABASE_URL

# Test connection
docker-compose exec backend npx prisma db push
```

**3. Port already in use**

```bash
# Find process using port
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Kill process or change port in .env
PORT=3001
```

**4. Permission denied errors**

```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./logs ./data ./uploads

# Or use Docker user
docker-compose exec -u root backend chown -R nodejs:nodejs /app/logs
```

**5. Out of disk space**

```bash
# Clean up Docker
docker system prune -a

# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune
```

**6. SSL certificate errors**

```bash
# Verify certificates exist
ls -la ./ssl/

# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Check nginx config
docker-compose exec nginx nginx -t
```

### Debug Mode

**Enable verbose logging:**

```bash
# .env
LOG_LEVEL=debug

# Restart
docker-compose restart backend
```

**Shell access:**
```bash
docker-compose exec backend sh
```

**Run commands directly:**
```bash
docker-compose exec backend node -e "console.log(process.env)"
```

---

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to version control
- Use strong, randomly generated secrets
- Rotate secrets regularly (quarterly recommended)
- Use different secrets for dev/staging/production

### 2. SSL/TLS
- Always use HTTPS in production
- Use Let's Encrypt for free certificates
- Enable HSTS headers
- Use TLS 1.2+ only

### 3. Container Security
- Run containers as non-root user
- Use read-only filesystems where possible
- Limit container resources
- Keep images updated
- Scan images for vulnerabilities

**Scan image:**
```bash
docker scan whatsapp-saas-backend:latest
```

### 4. Network Security
- Use internal networks for services
- Expose only necessary ports
- Implement rate limiting
- Use firewall rules

### 5. Database Security
- Use strong passwords
- Enable SSL connections in production
- Restrict network access
- Regular backups
- Encrypt backups

### 6. Monitoring
- Monitor container logs
- Set up alerts for errors
- Track resource usage
- Monitor failed login attempts

---

## Commands Reference

### Development

| Command | Description |
|---------|-------------|
| `./scripts/docker/dev-start.sh` | Start development environment |
| `./scripts/docker/dev-start.sh --build` | Rebuild and start |
| `./scripts/docker/dev-start.sh --tools` | Start with Adminer |
| `./scripts/docker/dev-start.sh --clean` | Clean volumes and start |
| `./scripts/docker/stop.sh dev` | Stop development |
| `docker-compose logs -f` | View logs |
| `docker-compose ps` | Check status |
| `docker-compose exec backend sh` | Shell access |

### Production

| Command | Description |
|---------|-------------|
| `./scripts/docker/prod-start.sh` | Start production environment |
| `./scripts/docker/prod-start.sh --build` | Rebuild and start |
| `./scripts/docker/stop.sh prod` | Stop production |
| `docker-compose -f docker-compose.prod.yml logs -f` | View logs |
| `docker-compose -f docker-compose.prod.yml ps` | Check status |

### Database

| Command | Description |
|---------|-------------|
| `./scripts/docker/backup.sh dev` | Backup development DB |
| `./scripts/docker/backup.sh prod` | Backup production DB |
| `docker-compose exec backend npx prisma migrate dev` | Run migrations (dev) |
| `docker-compose exec backend npx prisma migrate deploy` | Run migrations (prod) |
| `docker-compose exec backend npx prisma studio` | Open Prisma Studio |
| `docker-compose exec postgres psql -U postgres whatsapp_saas` | PostgreSQL CLI |

### Maintenance

| Command | Description |
|---------|-------------|
| `docker-compose restart backend` | Restart backend |
| `docker-compose up -d --build backend` | Rebuild backend |
| `docker system prune` | Clean Docker |
| `docker volume ls` | List volumes |
| `docker stats` | Resource usage |

---

## Production Deployment Checklist

Before deploying to production:

- [ ] `.env` file configured with production values
- [ ] Strong passwords generated for all services
- [ ] SSL certificates obtained and configured
- [ ] Domain DNS configured correctly
- [ ] Firewall rules configured (ports 80, 443 open)
- [ ] Nginx config updated with actual domain
- [ ] CORS origins configured for production domain
- [ ] Rate limiting configured appropriately
- [ ] Database backups automated
- [ ] Monitoring and alerting set up
- [ ] Log rotation configured
- [ ] Resource limits configured
- [ ] Health checks verified
- [ ] Rollback plan documented
- [ ] Team trained on deployment process

---

## Support

For issues or questions:
- Check troubleshooting section above
- Review Docker logs
- Check GitHub Issues
- Contact DevOps team

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Last Updated:** 2024-10-21
**Version:** 1.0.0
**Maintained By:** DevOps Team
