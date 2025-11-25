# WhatsApp SaaS Platform - NestJS Backend

Production-ready NestJS backend for WhatsApp Cloud API Booking SaaS Platform with enterprise-grade architecture, security, and scalability.

## Technology Stack

- **Framework:** NestJS 10.x (TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with Passport
- **API Documentation:** Swagger/OpenAPI
- **Security:** Helmet, CORS, Rate Limiting, Input Validation
- **Testing:** Jest
- **Code Quality:** ESLint, Prettier

## Architecture Overview

This backend follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── config/          # Configuration modules (app, database, jwt)
├── common/          # Shared utilities, guards, filters, pipes
├── database/        # Prisma service and database module
└── modules/         # Feature modules (to be implemented)
    ├── auth/        # Authentication & authorization
    ├── users/       # User management
    ├── organizations/ # Organization management
    ├── whatsapp/    # WhatsApp integration
    └── campaigns/   # Campaign management
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+ (for queues and caching)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your actual credentials
   ```

3. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run start:dev
   ```

The API will be available at:
- **API:** http://localhost:3000/api/v1
- **Swagger Docs:** http://localhost:3000/api/docs
- **Health Check:** http://localhost:3000/api/v1/health

## Available Scripts

### Development
- `npm run start:dev` - Start development server with watch mode
- `npm run start:debug` - Start with debugging enabled
- `npm run build` - Build production bundle
- `npm run start:prod` - Start production server

### Database
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with sample data

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_saas

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# WhatsApp API
WHATSAPP_API_VERSION=v18.0
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

## API Documentation

When running in development mode, comprehensive API documentation is available at:
- **Swagger UI:** http://localhost:3000/api/docs

The documentation includes:
- All endpoints with request/response schemas
- Authentication flows
- Example requests and responses
- Error codes and handling

## Security Features

This backend implements enterprise-grade security:

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - Refresh token mechanism

2. **API Security**
   - Helmet middleware for security headers
   - CORS configuration
   - Rate limiting (100 requests/minute)
   - Input validation with class-validator

3. **Database Security**
   - Prepared statements (SQL injection prevention)
   - Connection pooling
   - Query timeout configuration

4. **Password Security**
   - bcrypt hashing (10 rounds)
   - Password strength requirements

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **Salon** - WhatsApp Business Account configuration
- **Booking** - Customer booking records
- **Message** - WhatsApp message logs
- **Template** - Message template management
- **Conversation** - Conversation tracking
- **AIConversation** - AI-powered conversation management

Run `npm run prisma:studio` to explore the database visually.

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

## Production Deployment

### Build

```bash
npm run build
```

### Environment Configuration

1. Set `NODE_ENV=production`
2. Configure production database URL
3. Use strong JWT secrets
4. Enable HTTPS
5. Configure CORS with specific origins
6. Set up monitoring and logging

### Health Checks

Monitor application health at:
- `GET /api/v1/health` - Health check endpoint

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T15:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

## Project Structure

```
backend/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── config/                 # Configuration modules
│   ├── common/                 # Shared utilities
│   ├── database/               # Database module
│   └── modules/                # Feature modules
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── test/                       # Test files
└── README.md                   # This file
```

## License

ISC

---

Built with NestJS for enterprise-grade WhatsApp SaaS platform.
