# WhatsApp SaaS Starter - Comprehensive Codebase Map

**Generated:** October 25, 2025  
**Thoroughness Level:** Medium  
**Project Type:** Full-Stack Next.js + NestJS + PostgreSQL + WhatsApp Business API

---

## Executive Summary

This is a production-ready WhatsApp SaaS platform that enables businesses (particularly salons, spas, and service providers) to automate bookings, send messages, and manage customer interactions via WhatsApp. The platform features:

- **Multi-tenant architecture** with salon/user management
- **WhatsApp Business API integration** with webhook handling
- **AI-powered booking assistant** using OpenAI GPT
- **Analytics & Dashboard** for business metrics
- **Staff/Master management** with scheduling
- **Service catalog management**
- **Redis caching** and **BullMQ job queue** for performance
- **Full authentication** with JWT and refresh tokens
- **Security hardening** (CSRF protection, rate limiting, request sanitization)

---

## Backend API Structure

### Technology Stack
- **Framework:** NestJS (Node.js with TypeScript)
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT with refresh tokens
- **Caching:** Redis
- **Job Queue:** BullMQ
- **External API:** WhatsApp Cloud API, OpenAI API

### Modules Overview

The backend is organized into 14 feature modules with clear separation of concerns:

1. **Auth** - Authentication, JWT, CSRF tokens
2. **Salons** - Multi-tenant salon management, usage tracking
3. **Bookings** - Appointment management with status tracking
4. **Masters** - Staff/employees with schedules and availability
5. **Services** - Service catalog with categories and pricing
6. **Messages** - WhatsApp message storage and management
7. **Conversations** - Conversation threading for customers
8. **WhatsApp** - WhatsApp Business API integration, webhooks
9. **Templates** - WhatsApp message templates
10. **Reminders** - Appointment reminders via WhatsApp
11. **Analytics** - Dashboard stats and business metrics
12. **AI** - OpenAI GPT integration for booking assistant
13. **Cache** - Redis caching system (global)
14. **Queue** - BullMQ job queue (global)

