# Quick Start Guide

## Start the Application

```bash
cd C:\whatsapp-saas-starter\Frontend
npm run dev
```

Access at: **http://localhost:3001**

---

## Expected Output

```
▲ Next.js 14.2.33
- Local:        http://localhost:3001
- Environments: .env.local

✓ Starting...
✓ Ready in 4.6s
```

NO ERRORS should appear.

---

## Available Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| / | Home (redirects to /dashboard) | No |
| /login | Login page | No |
| /dashboard | Main dashboard | Yes |
| /dashboard/bookings | Booking management | Yes |
| /dashboard/messages | WhatsApp messages | Yes |
| /dashboard/analytics | Analytics & reports | Yes |
| /dashboard/settings | Settings | Yes |

---

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Missing Dependencies
```bash
npm install
```

### Environment Variables Missing
Check `.env.local` exists and contains:
```env
NEXTAUTH_SECRET=um3U5mA4t6NOdP+c5+eH/Y038Jvs7m+81uRp576bEqA=
AUTH_SECRET=um3U5mA4t6NOdP+c5+eH/Y038Jvs7m+81uRp576bEqA=
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

---

## Other Commands

```bash
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Check code quality
npm run type-check   # Check TypeScript
npm test             # Run tests
```

---

For detailed information, see **FINAL_STARTUP_GUIDE.md**
