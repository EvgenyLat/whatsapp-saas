# Frontend Setup Guide

**Status:** Configuration files created
**Next Step:** Install dependencies and create folder structure

This guide documents the complete setup process for the WhatsApp SaaS Platform frontend.

---

## ✅ Completed Configuration

### 1. Package Dependencies (package.json)
- **Framework:** Next.js 14.2.0 with App Router
- **React:** 18.3.0 with TypeScript 5.4.5
- **State Management:** Zustand 4.5.0 + React Query 5.22.0
- **Auth:** NextAuth.js v5.0.0-beta.13
- **Forms:** React Hook Form 7.50.0 + Zod 3.22.4
- **Styling:** Tailwind CSS 3.4.1 + Shadcn/ui components
- **Icons:** Lucide React 0.344.0
- **Charts:** Recharts 2.12.0
- **HTTP Client:** Axios 1.6.7
- **Dev Tools:** ESLint, Prettier, Husky, Lint-staged

### 2. TypeScript Configuration (tsconfig.json)
- Strict mode enabled
- Path aliases configured (@/components, @/lib, etc.)
- Next.js 14 plugin enabled
- Modern ES2022 target

### 3. Next.js Configuration (next.config.js)
- App Router enabled
- Server Actions enabled
- Image optimization configured
- Security headers added
- Performance optimization (code splitting, tree shaking)
- Bundle analyzer available

### 4. Tailwind CSS Configuration (tailwind.config.ts)
- Design tokens integrated
- All color palettes mapped
- Typography system configured
- Spacing, shadows, animations defined
- Shadcn/ui compatibility
- @tailwindcss/forms plugin added

---

## 📋 Remaining Setup Steps

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

**This will install:**
- Next.js 14 and React 18
- All UI libraries (Radix UI, Lucide icons)
- State management (Zustand, React Query)
- Form handling (React Hook Form, Zod)
- Auth (NextAuth.js v5)
- Development tools

**Expected time:** 2-5 minutes depending on internet speed

### Step 2: Create ESLint Configuration

Create `.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { "argsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

### Step 3: Create Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Create `.prettierignore`:

```
node_modules
.next
out
dist
build
*.lock
package-lock.json
```

### Step 4: Create PostCSS Configuration

Create `postcss.config.js`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Step 5: Create Environment Variables

Create `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl

# App Configuration
NEXT_PUBLIC_APP_NAME="WhatsApp SaaS Platform"
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Create `.env.example`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=

# NextAuth Configuration
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# App Configuration
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 6: Initialize Husky (Git Hooks)

```bash
cd frontend
npm run prepare
```

This will set up Git hooks for:
- Pre-commit: Run ESLint and Prettier on staged files
- Pre-push: Run type checking

### Step 7: Create Folder Structure

Run these commands to create the folder structure:

```bash
cd frontend

# Create src directory structure
mkdir -p src/app
mkdir -p src/components/ui
mkdir -p src/components/features/bookings
mkdir -p src/components/features/messages
mkdir -p src/components/features/analytics
mkdir -p src/components/features/auth
mkdir -p src/components/layout
mkdir -p src/components/shared
mkdir -p src/lib/api
mkdir -p src/lib/auth
mkdir -p src/lib/utils
mkdir -p src/hooks
mkdir -p src/store
mkdir -p src/types
mkdir -p src/styles
mkdir -p src/config

# Create public directory structure
mkdir -p public/icons
mkdir -p public/images
mkdir -p public/fonts
```

### Step 8: Copy Design Tokens to Styles

Copy the design tokens CSS file:

```bash
cp design-system/tokens.css src/styles/design-tokens.css
```

### Step 9: Create Global Styles

Create `src/styles/globals.css`:

```css
@import './design-tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }
}

@layer utilities {
  /* Custom utility classes */
  .text-balance {
    text-wrap: balance;
  }
}
```

---

## 🏗️ Next: Create Core Files

After completing the setup steps above, you'll need to create these core files:

### 1. Root Layout (`src/app/layout.tsx`)
- HTML structure
- Font loading
- Providers wrapper
- Metadata configuration

### 2. Providers (`src/app/providers.tsx`)
- React Query Provider
- NextAuth SessionProvider
- Toast Provider

### 3. API Client (`src/lib/api/client.ts`)
- Axios instance
- Request/response interceptors
- Error handling
- Token management

### 4. API Endpoints (`src/lib/api/endpoints.ts`)
- Type-safe API methods
- All backend endpoints
- Request/response types

### 5. Auth Configuration (`src/lib/auth/auth.ts`)
- NextAuth.js v5 configuration
- Credentials provider
- JWT callbacks
- Session management

### 6. Utility Functions (`src/lib/utils/cn.ts`)
- Class name merger (clsx + tailwind-merge)
- Date formatters
- Validation helpers

### 7. TypeScript Types (`src/types/`)
- Domain models (Booking, Message, Salon, User)
- API types
- Component prop types

### 8. Zustand Stores (`src/store/`)
- UI state store
- User preferences store
- Filter state store

### 9. Custom Hooks (`src/hooks/`)
- useAuth hook
- useBookings hook (React Query)
- useMessages hook (React Query)
- useDebounce hook
- useLocalStorage hook

### 10. Base Components (`src/components/ui/`)
- Button component with variants
- Input component
- Card component
- Modal component
- All Shadcn/ui components

---

## 🚀 Running the Development Server

After completing all setup steps:

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3001`

---

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start development server (port 3001)
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run type-check       # Run TypeScript compiler
npm run format           # Format with Prettier
npm run format:check     # Check Prettier formatting
npm run quality-check    # Run all checks (type, lint, format, test)

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:ci          # Run tests in CI mode
```

---

## 🎨 Design System Integration

All design tokens from `design-system/tokens.css` are integrated:

- **Colors:** Accessible via Tailwind (e.g., `bg-primary-500`, `text-error-600`)
- **Typography:** Font sizes, weights, line heights
- **Spacing:** 8px grid system
- **Shadows:** Elevation levels
- **Border Radius:** Consistent corner rounding
- **Transitions:** Animation timing

**Example usage:**

```tsx
<button className="bg-primary-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-primary-600 transition-colors">
  Click me
</button>
```

---

## 🔐 Authentication Flow

1. User submits login form
2. NextAuth.js sends credentials to backend API
3. Backend validates and returns JWT token
4. NextAuth stores token in session
5. API client adds token to all requests
6. Middleware protects routes

---

## 🗂️ File Naming Conventions

- **Components:** PascalCase (e.g., `Button.tsx`, `BookingTable.tsx`)
- **Utilities:** camelCase (e.g., `cn.ts`, `formatDate.ts`)
- **Hooks:** camelCase with 'use' prefix (e.g., `useAuth.ts`, `useBookings.ts`)
- **Types:** PascalCase (e.g., `Booking.ts`, `ApiResponse.ts`)
- **Pages:** lowercase (e.g., `page.tsx`, `layout.tsx`)

---

## 📚 Additional Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture documentation
- **[Design System Documentation](./design-system/)** - UI/UX specifications
- **[Backend API Docs](../docs/api/README.md)** - API endpoints and authentication

---

## ✅ Setup Checklist

- [x] Created package.json with all dependencies
- [x] Configured TypeScript with strict mode
- [x] Set up Next.js 14 with App Router
- [x] Configured Tailwind CSS with design tokens
- [ ] Install npm dependencies
- [ ] Create ESLint configuration
- [ ] Create Prettier configuration
- [ ] Create PostCSS configuration
- [ ] Set up environment variables
- [ ] Initialize Husky
- [ ] Create folder structure
- [ ] Copy design tokens
- [ ] Create global styles
- [ ] Create root layout
- [ ] Set up providers
- [ ] Create API client
- [ ] Configure authentication
- [ ] Create utility functions
- [ ] Define TypeScript types
- [ ] Create Zustand stores
- [ ] Create custom hooks
- [ ] Build UI components
- [ ] Create example pages

---

**Ready to continue?** Run `npm install` in the frontend directory to begin!
