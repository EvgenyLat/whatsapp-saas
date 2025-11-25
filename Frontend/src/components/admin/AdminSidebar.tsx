/**
 * Admin Sidebar Component
 * Navigation sidebar for super admin panel
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  X,
  Menu,
  Shield,
  LogOut,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Salons',
    href: '/admin/salons',
    icon: Building2,
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    label: 'System',
    href: '/admin/system',
    icon: Database,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 transform border-r border-neutral-200 bg-gradient-to-b from-neutral-900 to-neutral-800 transition-transform duration-300 lg:translate-x-0 lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Admin sidebar navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo and close button */}
          <div className="flex h-16 items-center justify-between border-b border-neutral-700 px-6">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-semibold text-white">Admin Panel</span>
                <p className="text-xs text-neutral-400">Super Admin</p>
              </div>
            </Link>

            <button
              onClick={toggleSidebar}
              className="lg:hidden rounded-md p-2 hover:bg-neutral-700 text-neutral-400"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4" aria-label="Admin navigation">
            <ul className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/admin');
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User profile section */}
          <div className="border-t border-neutral-700 p-4">
            <div className="flex items-center gap-3 rounded-md px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || 'Admin'}
                </p>
                <p className="text-xs text-neutral-400 truncate">
                  {user?.email || 'admin@example.com'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg lg:hidden"
        aria-label="Open sidebar"
        aria-expanded={sidebarOpen}
      >
        <Menu className="h-6 w-6" />
      </button>
    </>
  );
}
