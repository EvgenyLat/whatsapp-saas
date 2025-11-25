# WhatsApp SaaS Starter 🚀

Production-ready WhatsApp Cloud API booking system with multi-tenant support, built for scalability and reliability.

## ✨ Features

### Core Functionality
- **Multi-tenant WhatsApp integration** - Support multiple salons with separate credentials
- **AI-Powered Conversations** - ChatGPT integration for natural language processing
- **Intelligent message parsing** - Advanced AI intent recognition and context awareness
- **Automated booking management** - AI-driven conflict detection and alternative suggestions
- **Template message support** - HSM (Highly Structured Messages) for notifications
- **Real-time webhook processing** - Fast AI-powered response to WhatsApp messages
- **Conversation Analytics** - AI usage tracking, cost analysis, and performance metrics

### Production Features
- **High Availability** - PostgreSQL database with Redis caching
- **Message Queues** - BullMQ for reliable message processing
- **Rate Limiting** - Protection against spam and abuse
- **Security** - Helmet, CORS, input validation, HMAC verification
- **Monitoring** - Comprehensive logging with Winston
- **Health Checks** - Service status monitoring
- **Docker Support** - Containerized deployment with Docker Compose
- **Auto-scaling Ready** - Horizontal scaling support

### Admin Features
- **Salon Management** - Add/update salon credentials via API
- **Analytics** - Booking and message statistics
- **Template Management** - WhatsApp template administration
- **Billing Integration** - Message cost tracking per salon

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Load Balancer │    │   Application   │
│   Cloud API     │◄───┤   (Nginx)       │◄───┤   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │   PostgreSQL    │◄───────────┤
                       │   Database      │            │
                       └─────────────────┘            │
                                                      │
                       ┌─────────────────┐            │
                       │   Redis Cache   │◄───────────┤
                       │   & Message Q   │            │
                       └─────────────────┘            │
                                                      │
                       ┌─────────────────┐            │
                       │   File Storage  │◄───────────┘
                       │   (Logs/Data)   │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 1. Clone and Setup
```bash
git clone <repository-url>
cd whatsapp-saas-starter
cp env.example .env
```

### 2. Configure Environment
Edit `.env` file with your credentials:
```bash
# Required
ADMIN_TOKEN=your-secure-admin-token
META_VERIFY_TOKEN=your-meta-verify-token
META_APP_SECRET=your-meta-app-secret

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/whatsapp_saas

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

### 3. Deploy with Docker
```bash
# One-command deployment
npm run deploy

# Or manual deployment
docker-compose up -d
```

### 4. Setup Database
```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec app npm run db:seed
```

### 5. Configure Meta WhatsApp
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create WhatsApp Business App
3. Set webhook URL: `https://yourdomain.com/webhook`
4. Set verify token: `your-meta-verify-token`
5. Subscribe to `messages` events

## 📱 Usage

### Adding a Salon
```bash
curl -X POST https://yourdomain.com/admin/salons \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your-admin-token" \
  -d '{
    "name": "Beauty Salon",
    "phone_number_id": "123456789012345",
    "access_token": "EAABwzLixnjYBO..."
  }'
```

### AI-Powered Customer Flow
1. Customer sends: `"Привет! Хочу записаться на стрижку завтра в 14:00"`
2. AI responds: `"Привет! 😊 Отлично, записываю вас на стрижку завтра в 14:00. Как вас зовут?"`
3. Customer: `"Меня зовут Анна"`
4. AI responds: `"Прекрасно, Анна! ✅ Ваша запись подтверждена:\n📅 Стрижка завтра в 14:00\n🔑 Код отмены: ABC123\n\nДо встречи! 💇‍♀️"`
5. Customer can cancel: `"Хочу отменить запись ABC123"`
6. AI responds: `"Конечно, Анна! Бронирование ABC123 отменено. Можете записаться в другое время! 😊"`

### AI Conversation Capabilities
- **Natural Language Understanding** - Understands context and intent from any message
- **Multi-turn Conversations** - Remembers previous messages and context
- **Personalized Responses** - Uses customer name and booking history
- **Smart Booking Logic** - Asks clarifying questions when needed
- **Flexible Input** - Accepts various ways of expressing the same intent
- **Emotional Intelligence** - Responds with appropriate tone and emojis

### Example AI Interactions
- **Booking**: `"записаться завтра в 14:00"`, `"хочу стрижку на завтра"`, `"можно записаться?"`
- **Cancel**: `"отменить ABC123"`, `"хочу отменить запись"`, `"не смогу прийти"`
- **FAQ**: `"сколько стоит"`, `"какие услуги есть"`, `"во сколько работаете"`
- **General**: `"привет"`, `"спасибо"`, `"до свидания"`

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Start database
docker-compose up -d db redis

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Deploy migrations
npm run db:deploy

# Reset database
npm run db:reset
```

## 🐳 Docker Commands

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Docker Compose
npm run docker:compose:up
npm run docker:compose:down
npm run docker:compose:logs
```

## 📊 Monitoring

### Health Check
```bash
curl https://yourdomain.com/healthz
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T10:00:00.000Z",
  "uptime": 3600,
  "memory": { "rss": 50000000, "heapTotal": 20000000 },
  "services": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "queues": { "send-message": { "waiting": 0, "active": 2 } }
  }
}
```

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f redis
```

## 🔒 Security

### Rate Limiting
- **Webhook**: 100 requests/15min per IP
- **Admin API**: 20 requests/15min per IP
- **General**: 1000 requests/15min per IP

### Security Headers
- Helmet.js for security headers
- CORS protection
- Input validation with Joi
- HMAC signature verification
- SQL injection protection (Prisma)

### Environment Variables
All sensitive data stored in environment variables:
- Database credentials
- API tokens
- Encryption keys
- Admin tokens

## 📈 Scaling

### Horizontal Scaling
1. **Load Balancer**: Use Nginx or cloud load balancer
2. **Multiple Instances**: Run multiple app containers
3. **Database**: Use read replicas for read-heavy workloads
4. **Redis Cluster**: For high availability caching
5. **Message Queues**: Scale workers independently

### Performance Optimization
- **Redis Caching**: Frequently accessed data cached
- **Database Indexing**: Optimized queries with Prisma
- **Connection Pooling**: Efficient database connections
- **Message Queues**: Async processing for heavy operations

## 🛠️ Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `ADMIN_TOKEN` | Admin API token | Required |
| `META_VERIFY_TOKEN` | Meta webhook token | Required |
| `META_APP_SECRET` | Meta app secret | Required |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging level | `info` |

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| `/webhook` | 100 req | 15 min |
| `/admin/*` | 20 req | 15 min |
| `/*` | 1000 req | 15 min |

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check database status
docker-compose logs db

# Restart database
docker-compose restart db
```

**2. Redis Connection Failed**
```bash
# Check Redis status
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

**3. Webhook Not Receiving Messages**
- Verify webhook URL is accessible
- Check Meta app configuration
- Verify HMAC signature validation
- Check logs: `docker-compose logs app`

**4. Messages Not Sending**
- Verify WhatsApp credentials
- Check rate limits
- Verify phone number format
- Check message queue status

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# View detailed logs
docker-compose logs -f app | grep DEBUG
```

## 📚 API Reference

### Admin Endpoints

#### Create/Update Salon
```http
POST /admin/salons
Content-Type: application/json
x-admin-token: your-token

{
  "name": "Salon Name",
  "phone_number_id": "123456789012345",
  "access_token": "EAABwzLixnjYBO..."
}
```

#### Get All Salons
```http
GET /admin/salons
x-admin-token: your-token
```

#### Get AI Analytics
```http
GET /admin/ai/analytics/{salonId}?startDate=2025-01-01&endDate=2025-01-31
x-admin-token: your-token
```

#### Get AI Conversation Stats
```http
GET /admin/ai/conversations/{salonId}?startDate=2025-01-01&endDate=2025-01-31
x-admin-token: your-token
```

### Webhook Endpoints

#### Verify Webhook
```http
GET /webhook?hub.mode=subscribe&hub.verify_token=your-token&hub.challenge=challenge
```

#### Receive Messages
```http
POST /webhook
Content-Type: application/json
x-hub-signature-256: sha256=signature

{
  "object": "whatsapp_business_account",
  "entry": [...]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🎯 Roadmap

- [ ] Admin dashboard UI
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Payment integration
- [ ] SMS fallback
- [ ] Voice message support
- [ ] AI chatbot integration
- [ ] Mobile app

---

**Made with ❤️ for the WhatsApp Business ecosystem**
