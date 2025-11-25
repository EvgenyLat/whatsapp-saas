# Frontend Architecture

**Version:** 1.0.0
**Last Updated:** January 18, 2025
**Framework:** Next.js 14 with App Router
**Language:** TypeScript 5+

This document defines the complete frontend architecture for the WhatsApp SaaS Platform.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Architecture Patterns](#architecture-patterns)
4. [State Management](#state-management)
5. [Routing & Navigation](#routing--navigation)
6. [Data Fetching](#data-fetching)
7. [Authentication](#authentication)
8. [API Integration](#api-integration)
9. [Styling Strategy](#styling-strategy)
10. [Build & Deployment](#build--deployment)

---

## Technology Stack

### Core Framework

```json
{
  "next": "14.2.0",
  "react": "18.3.0",
  "typescript": "5.4.0"
}
```

**Why Next.js 14 App Router?**
- Server Components for better performance
- Streaming and Suspense support
- Improved routing with layouts
- Built-in image and font optimization
- Excellent TypeScript support

### UI & Styling

```json
{
  "tailwindcss": "3.4.0",
  "@tailwindcss/forms": "0.5.7",
  "shadcn/ui": "latest",
  "lucide-react": "0.344.0",
  "class-variance-authority": "0.7.0",
  "clsx": "2.1.0",
  "tailwind-merge": "2.2.0"
}
```

**Styling Philosophy:**
- Tailwind CSS for utility-first styling
- Shadcn/ui for accessible, customizable components
- CSS custom properties (design tokens) for theming
- CVA for type-safe variant management

### State Management

```json
{
  "zustand": "4.5.0",
  "@tanstack/react-query": "5.22.0"
}
```

**State Strategy:**
- **Zustand:** Client-side global state (UI state, user preferences)
- **React Query:** Server state (API data, caching, synchronization)
- **React Context:** Scoped state (theme, modals)
- **URL State:** Search params, filters, pagination

### Forms & Validation

```json
{
  "react-hook-form": "7.50.0",
  "zod": "3.22.4",
  "@hookform/resolvers": "3.3.4"
}
```

**Form Strategy:**
- React Hook Form for performant forms
- Zod for schema validation
- Type-safe form data with TypeScript

### Authentication

```json
{
  "next-auth": "5.0.0-beta.13"
}
```

**Auth Strategy:**
- NextAuth.js v5 (Auth.js) with custom provider
- JWT tokens for session management
- Middleware for route protection
- Server-side session validation

### Data Visualization

```json
{
  "recharts": "2.12.0",
  "date-fns": "3.3.0"
}
```

### HTTP Client

```json
{
  "axios": "1.6.7"
}
```

**API Client Features:**
- Request/response interceptors
- Automatic token refresh
- Error handling
- Request cancellation

### Development Tools

```json
{
  "eslint": "8.56.0",
  "prettier": "3.2.5",
  "@typescript-eslint/eslint-plugin": "7.0.0",
  "husky": "9.0.10",
  "lint-staged": "15.2.0"
}
```

---

## Project Structure

### Directory Organization

```
frontend/
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Protected dashboard route group
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          # Dashboard home
│   │   │   │   ├── bookings/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── messages/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx            # Dashboard layout with sidebar
│   │   ├── (admin)/                  # Super admin route group
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── salons/
│   │   │   │   ├── users/
│   │   │   │   └── monitoring/
│   │   │   └── layout.tsx
│   │   ├── api/                      # API routes (if needed)
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── error.tsx                 # Error boundary
│   │   ├── loading.tsx               # Loading state
│   │   └── not-found.tsx             # 404 page
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   └── ...
│   │   ├── features/                 # Feature-specific components
│   │   │   ├── bookings/
│   │   │   │   ├── BookingTable.tsx
│   │   │   │   ├── BookingForm.tsx
│   │   │   │   ├── BookingCard.tsx
│   │   │   │   └── BookingFilters.tsx
│   │   │   ├── messages/
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── ChatWindow.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   ├── LineChart.tsx
│   │   │   │   └── BarChart.tsx
│   │   │   └── auth/
│   │   │       └── LoginForm.tsx
│   │   ├── layout/                   # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   └── shared/                   # Shared/common components
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── EmptyState.tsx
│   │       └── Pagination.tsx
│   │
│   ├── lib/                          # Core utilities
│   │   ├── api/                      # API client
│   │   │   ├── client.ts             # Axios instance
│   │   │   ├── endpoints.ts          # API endpoints
│   │   │   └── types.ts              # API types
│   │   ├── auth/                     # Auth utilities
│   │   │   ├── auth.ts               # NextAuth config
│   │   │   ├── middleware.ts         # Auth middleware
│   │   │   └── session.ts            # Session helpers
│   │   ├── utils/                    # Utility functions
│   │   │   ├── cn.ts                 # Class name merger
│   │   │   ├── format.ts             # Formatters
│   │   │   ├── date.ts               # Date utilities
│   │   │   └── validation.ts         # Validators
│   │   └── constants.ts              # App constants
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts                # Authentication hook
│   │   ├── useBookings.ts            # Bookings data hook
│   │   ├── useMessages.ts            # Messages data hook
│   │   ├── useDebounce.ts            # Debounce hook
│   │   ├── useLocalStorage.ts        # Local storage hook
│   │   └── useMediaQuery.ts          # Responsive hook
│   │
│   ├── store/                        # Zustand stores
│   │   ├── useUIStore.ts             # UI state (sidebar, modals)
│   │   ├── useUserStore.ts           # User preferences
│   │   └── useFiltersStore.ts        # Filter state
│   │
│   ├── types/                        # TypeScript types
│   │   ├── api.ts                    # API response types
│   │   ├── models.ts                 # Domain models
│   │   ├── components.ts             # Component prop types
│   │   └── index.ts                  # Type exports
│   │
│   ├── styles/                       # Global styles
│   │   ├── globals.css               # Global CSS + Tailwind
│   │   └── design-tokens.css         # Design system tokens
│   │
│   └── config/                       # Configuration files
│       ├── site.ts                   # Site metadata
│       ├── navigation.ts             # Navigation config
│       └── env.ts                    # Environment variables
│
├── public/                           # Static assets
│   ├── icons/
│   ├── images/
│   └── fonts/
│
├── .env.local                        # Environment variables
├── .env.example                      # Example env file
├── next.config.js                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── postcss.config.js                 # PostCSS config
├── .eslintrc.json                    # ESLint config
├── .prettierrc                       # Prettier config
└── package.json                      # Dependencies
```

### Route Groups

Next.js 14 uses route groups (folders in parentheses) to organize routes without affecting URL structure:

```
(auth)/          → Authentication pages (no /auth in URL)
(dashboard)/     → Salon admin pages (with sidebar layout)
(admin)/         → Super admin pages (with different sidebar)
```

---

## Architecture Patterns

### 1. Server Components First

**Default to Server Components, use Client Components only when needed.**

#### Server Component (Default)
```tsx
// app/dashboard/page.tsx
import { getBookings } from '@/lib/api/bookings';

export default async function DashboardPage() {
  const bookings = await getBookings(); // Fetch on server

  return (
    <div>
      <h1>Dashboard</h1>
      <BookingList bookings={bookings} />
    </div>
  );
}
```

#### Client Component (When Needed)
```tsx
// components/features/bookings/BookingFilters.tsx
'use client';

import { useState } from 'react';

export function BookingFilters() {
  const [filters, setFilters] = useState({});

  return (
    <div>
      {/* Interactive filters need client-side state */}
    </div>
  );
}
```

**Use Client Components for:**
- Event handlers (onClick, onChange)
- State hooks (useState, useReducer)
- Effect hooks (useEffect)
- Browser APIs (localStorage, window)
- Custom hooks

### 2. Composition Pattern

**Compose Server and Client Components:**

```tsx
// app/dashboard/page.tsx (Server Component)
import { BookingFilters } from '@/components/features/bookings/BookingFilters';
import { BookingTable } from '@/components/features/bookings/BookingTable';

export default async function BookingsPage() {
  const bookings = await getBookings(); // Server-side fetch

  return (
    <div>
      <BookingFilters /> {/* Client Component */}
      <BookingTable data={bookings} /> {/* Can be Server or Client */}
    </div>
  );
}
```

### 3. Parallel Data Fetching

**Fetch data in parallel for better performance:**

```tsx
// app/dashboard/page.tsx
async function Dashboard() {
  // Parallel data fetching
  const [bookings, messages, stats] = await Promise.all([
    getBookings(),
    getMessages(),
    getStats()
  ]);

  return (
    <>
      <StatsCards stats={stats} />
      <BookingsList bookings={bookings} />
      <MessagesList messages={messages} />
    </>
  );
}
```

### 4. Streaming with Suspense

**Stream content as it becomes available:**

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { BookingsSkeleton } from '@/components/skeletons';

export default function Dashboard() {
  return (
    <div>
      <StatsCards /> {/* Loads immediately */}

      <Suspense fallback={<BookingsSkeleton />}>
        <BookingsList /> {/* Streams when ready */}
      </Suspense>
    </div>
  );
}

// Separate async component
async function BookingsList() {
  const bookings = await getBookings();
  return <BookingTable data={bookings} />;
}
```

---

## State Management

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Application State                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Server    │  │    Client    │  │      URL      │  │
│  │    State    │  │    State     │  │     State     │  │
│  │             │  │              │  │               │  │
│  │ React Query │  │   Zustand    │  │ Search Params │  │
│  │             │  │              │  │               │  │
│  │ • Bookings  │  │ • Sidebar    │  │ • Filters     │  │
│  │ • Messages  │  │ • Modals     │  │ • Pagination  │  │
│  │ • Analytics │  │ • Theme      │  │ • Sorting     │  │
│  │ • User data │  │ • Toast      │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1. Server State (React Query)

**For data from API:**

```tsx
// hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function useBookings(salonId: string) {
  return useQuery({
    queryKey: ['bookings', salonId],
    queryFn: () => api.bookings.getAll(salonId),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

export function useCreateBooking(salonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingInput) =>
      api.bookings.create(salonId, data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['bookings', salonId] });
    },
  });
}
```

**Usage in component:**

```tsx
'use client';

import { useBookings, useCreateBooking } from '@/hooks/useBookings';

export function BookingsPage({ salonId }: { salonId: string }) {
  const { data, isLoading, error } = useBookings(salonId);
  const createBooking = useCreateBooking(salonId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <BookingTable data={data} />;
}
```

### 2. Client State (Zustand)

**For UI state:**

```tsx
// store/useUIStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      toggleSidebar: () => set((state) => ({
        sidebarOpen: !state.sidebarOpen
      })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage', // localStorage key
      partialize: (state) => ({
        theme: state.theme // Only persist theme
      }),
    }
  )
);
```

**Usage:**

```tsx
'use client';

import { useUIStore } from '@/store/useUIStore';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside className={sidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

### 3. URL State (Search Params)

**For shareable filter state:**

```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export function BookingFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1');

  const updateFilters = (newStatus: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('status', newStatus);
    params.set('page', '1'); // Reset to page 1
    router.push(`?${params.toString()}`);
  };

  return (
    <select value={status} onChange={(e) => updateFilters(e.target.value)}>
      <option value="all">All</option>
      <option value="confirmed">Confirmed</option>
      <option value="pending">Pending</option>
    </select>
  );
}
```

---

## Routing & Navigation

### App Router Structure

```tsx
// app/layout.tsx - Root Layout
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

// app/(dashboard)/layout.tsx - Dashboard Layout
export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}

// app/(dashboard)/dashboard/page.tsx - Page
export default function DashboardPage() {
  return <div>Dashboard content</div>;
}
```

### Navigation

```tsx
// components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarIcon },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav>
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname === item.href ? 'active' : ''}
        >
          <item.icon />
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
```

### Protected Routes

```tsx
// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

---

## Data Fetching

### React Query Setup

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Query Patterns

#### 1. Basic Query
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['bookings', salonId],
  queryFn: () => api.bookings.getAll(salonId),
});
```

#### 2. Dependent Query
```tsx
const { data: salon } = useQuery({
  queryKey: ['salon', salonId],
  queryFn: () => api.salons.get(salonId),
});

const { data: bookings } = useQuery({
  queryKey: ['bookings', salonId],
  queryFn: () => api.bookings.getAll(salonId),
  enabled: !!salon, // Only run if salon is loaded
});
```

#### 3. Paginated Query
```tsx
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['messages', salonId],
  queryFn: ({ pageParam = 1 }) =>
    api.messages.getAll(salonId, { page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
});
```

#### 4. Mutation with Optimistic Update
```tsx
const updateBooking = useMutation({
  mutationFn: (booking: Booking) => api.bookings.update(booking.id, booking),
  onMutate: async (newBooking) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['bookings'] });

    // Snapshot previous value
    const previousBookings = queryClient.getQueryData(['bookings']);

    // Optimistically update
    queryClient.setQueryData(['bookings'], (old: Booking[]) =>
      old.map((b) => (b.id === newBooking.id ? newBooking : b))
    );

    return { previousBookings };
  },
  onError: (err, newBooking, context) => {
    // Rollback on error
    queryClient.setQueryData(['bookings'], context?.previousBookings);
  },
  onSettled: () => {
    // Refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  },
});
```

---

## Authentication

### NextAuth.js v5 Configuration

```tsx
// lib/auth/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { api } from '@/lib/api/client';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        try {
          const response = await api.auth.login({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          if (response.user && response.token) {
            return {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              accessToken: response.token,
            };
          }

          return null;
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

### Auth Hook

```tsx
// hooks/useAuth.ts
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    token: session?.accessToken,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    signIn,
    signOut,
  };
}
```

---

## API Integration

### Axios Client Setup

```tsx
// lib/api/client.ts
import axios from 'axios';
import { getSession } from 'next-auth/react';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export { apiClient };
```

### API Endpoints

```tsx
// lib/api/endpoints.ts
import { apiClient } from './client';
import type { Booking, Message, Salon, Stats } from '@/types';

export const api = {
  bookings: {
    getAll: (salonId: string, params?: any) =>
      apiClient.get<Booking[]>(`/admin/bookings/${salonId}`, { params }),

    getById: (salonId: string, bookingId: string) =>
      apiClient.get<Booking>(`/admin/bookings/${salonId}/${bookingId}`),

    create: (salonId: string, data: Partial<Booking>) =>
      apiClient.post<Booking>(`/admin/bookings/${salonId}`, data),

    update: (salonId: string, bookingId: string, data: Partial<Booking>) =>
      apiClient.put<Booking>(`/admin/bookings/${salonId}/${bookingId}`, data),

    delete: (salonId: string, bookingId: string) =>
      apiClient.delete(`/admin/bookings/${salonId}/${bookingId}`),
  },

  messages: {
    getAll: (salonId: string, params?: any) =>
      apiClient.get<Message[]>(`/admin/messages/${salonId}`, { params }),
  },

  salons: {
    getAll: () =>
      apiClient.get<Salon[]>('/admin/salons'),

    getById: (salonId: string) =>
      apiClient.get<Salon>(`/admin/salons/${salonId}`),

    create: (data: Partial<Salon>) =>
      apiClient.post<Salon>('/admin/salons', data),
  },

  stats: {
    get: (salonId: string) =>
      apiClient.get<Stats>(`/admin/stats/${salonId}`),
  },

  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials),

    logout: () =>
      apiClient.post('/auth/logout'),
  },
};
```

---

## Styling Strategy

### Tailwind Configuration

```tsx
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          // ... all shades
          900: 'var(--color-primary-900)',
        },
      },
      spacing: {
        // Map to design tokens
      },
      fontFamily: {
        sans: ['var(--font-family-sans)'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;
```

### Class Variance Authority (CVA)

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50',
        tertiary: 'text-primary-500 hover:bg-primary-50',
        danger: 'bg-error-500 text-white hover:bg-error-600',
      },
      size: {
        sm: 'h-8 px-4 text-sm',
        md: 'h-10 px-6 text-base',
        lg: 'h-12 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

---

## Build & Deployment

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
```

### Build Configuration

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\""
  }
}
```

---

**End of Architecture Documentation**
