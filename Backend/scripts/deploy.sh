#!/bin/bash

# WhatsApp SaaS Deployment Script
set -e

echo "🚀 Starting WhatsApp SaaS deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("ADMIN_TOKEN" "META_VERIFY_TOKEN" "META_APP_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set."
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Create necessary directories
mkdir -p logs data ssl

# Generate self-signed SSL certificate for development
if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
    echo "🔐 Generating self-signed SSL certificate..."
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo "✅ SSL certificate generated"
fi

# Build and start services
echo "🐳 Building and starting Docker containers..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec app npx prisma migrate deploy

# Check if services are healthy
echo "🏥 Checking service health..."
if curl -f http://localhost/healthz > /dev/null 2>&1; then
    echo "✅ Application is healthy"
else
    echo "❌ Application health check failed"
    docker-compose logs app
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Service URLs:"
echo "   Application: https://localhost"
echo "   Health Check: https://localhost/healthz"
echo "   Admin API: https://localhost/admin"
echo ""
echo "📊 Monitoring:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo ""
echo "🔧 Next steps:"
echo "   1. Configure your domain and SSL certificates"
echo "   2. Set up Meta WhatsApp webhook: https://localhost/webhook"
echo "   3. Add your first salon via admin API"
echo "   4. Test the booking flow"
