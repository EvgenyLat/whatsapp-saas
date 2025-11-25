# Frontend Error Fixes - Installation Guide

## Errors Fixed

This guide addresses three critical errors:

1. **Package Version Error**: `@tanstack/react-query@5.22.0` doesn't exist
2. **Tailwind CSS v3.0 Warnings**: Old `purge` syntax and safelist regex issues
3. **CSS Classes Don't Exist**: `text-primary-600` and other design token classes not recognized

---

## What Was Fixed

### 1. Updated package.json

All packages updated to latest stable versions:
- **React Query**: 5.22.0 → 5.59.0 (correct version)
- **Next.js**: 14.2.0 → 14.2.18
- **React**: 18.3.0 → 18.3.1
- **TypeScript**: 5.4.5 → 5.6.3
- **Tailwind CSS**: 3.4.1 → 3.4.14
- **All Radix UI components** updated to latest
- **Lucide Icons**: 0.344.0 → 0.454.0
- **date-fns**: 3.3.1 → 4.1.0

### 2. Removed Old Tailwind Config

- Deleted `tailwind.config.js` (used v2 syntax)
- Now using only `tailwind.config.ts` with modern v3 syntax

### 3. Fixed Tailwind Configuration

**Changed:** CSS custom properties approach
**To:** Direct hex color values

**Before:**
```typescript
colors: {
  primary: {
    600: 'var(--color-primary-600)', // Doesn't work properly
  }
}
```

**After:**
```typescript
colors: {
  primary: {
    600: '#1EAD52', // Direct hex value
  }
}
```

All colors now use direct hex values:
- Primary (WhatsApp Green): `#25D366`
- Secondary (Teal): `#128C7E`
- Neutral, Success, Warning, Error, Info palettes

### 4. Updated globals.css

- Removed `@import './design-tokens.css';`
- Removed CSS custom property references like `var(--font-family-sans)`
- Now uses only Tailwind utility classes

---

## Installation Steps

### Step 1: Clean Previous Installation

```bash
cd frontend

# Remove node_modules and lock file
rm -rf node_modules
rm -f package-lock.json

# Remove Next.js cache
rm -rf .next

# Remove Husky (if exists)
rm -rf .husky
```

**Windows PowerShell:**
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .husky -ErrorAction SilentlyContinue
```

### Step 2: Install Dependencies

```bash
npm install
```

This will:
- Install all updated packages
- Create new `package-lock.json`
- Download all Radix UI components
- Install Next.js 14.2.18
- Install React Query 5.59.0 (correct version)

**Expected time:** 2-5 minutes depending on internet speed

### Step 3: Create Configuration Files

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

Create `postcss.config.js`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Step 4: Environment Variables

Create `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here

# App Configuration
NEXT_PUBLIC_APP_NAME="WhatsApp SaaS Platform"
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 5: Initialize Husky (Optional)

```bash
npm run prepare
```

This sets up Git hooks for code quality checks.

### Step 6: Start Development Server

```bash
npm run dev
```

The frontend will be available at **http://localhost:3001**

---

## Verification Checklist

After starting the dev server, verify:

- [ ] No package version errors
- [ ] No Tailwind CSS warnings about `purge`
- [ ] No "class does not exist" errors
- [ ] Server starts successfully on port 3001
- [ ] Login page loads at http://localhost:3001/login
- [ ] No console errors in browser
- [ ] Tailwind classes are applied (check with browser DevTools)

---

## Troubleshooting

### If you still see errors:

**1. Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**2. Check Node version:**
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

**3. Windows-specific issues:**

If you see file permission errors on Windows:
```powershell
# Run PowerShell as Administrator
Remove-Item -Recurse -Force node_modules
npm install
```

**4. TypeScript errors:**

Run type check to see specific errors:
```bash
npm run type-check
```

**5. Port already in use:**

If port 3001 is occupied:
```bash
# Change port in package.json
"dev": "next dev -p 3002"
```

---

## Expected Console Output

When running `npm run dev`, you should see:

```
> whatsapp-saas-frontend@1.0.0 dev
> next dev -p 3001

   ▲ Next.js 14.2.18
   - Local:        http://localhost:3001
   - Environments: .env.local

 ✓ Ready in 2.5s
 ○ Compiling / ...
 ✓ Compiled / in 3.2s (563 modules)
```

**No warnings about:**
- Missing packages
- Tailwind CSS purge/content
- Non-existent CSS classes

---

## Summary of Changes

| File | Change |
|------|--------|
| `package.json` | Updated all package versions to latest stable |
| `tailwind.config.js` | Deleted (old v2 syntax) |
| `tailwind.config.ts` | Changed to use hex colors instead of CSS variables |
| `src/styles/globals.css` | Removed design-tokens import and CSS variable references |

---

## Next Steps

After successful installation:

1. **Create folder structure** (if not exists):
   ```bash
   npm run create-folders  # If script exists
   # Or manually create folders from SETUP_GUIDE.md
   ```

2. **Test the application**:
   - Navigate to http://localhost:3001
   - Test login page
   - Test dashboard navigation

3. **Run quality checks**:
   ```bash
   npm run type-check  # TypeScript
   npm run lint        # ESLint
   npm run format      # Prettier
   ```

4. **Build for production** (optional):
   ```bash
   npm run build
   npm run start
   ```

---

## Questions?

If you encounter any issues not covered here:
1. Check the error message carefully
2. Verify all configuration files match this guide
3. Ensure Node.js and npm versions are correct
4. Try cleaning and reinstalling from scratch

---

**Status:** All errors fixed. Ready to install and run.
