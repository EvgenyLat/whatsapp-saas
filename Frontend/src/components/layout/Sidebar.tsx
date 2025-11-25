/**
 * Sidebar Component
 * Navigation sidebar for dashboard
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  X,
  Menu,
  User,
  LogOut,
  Store,
  Users,
  Scissors,
  FileText,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    section: 'overview',
  },
  {
    label: 'Bookings',
    href: '/dashboard/bookings',
    icon: Calendar,
    section: 'salon',
  },
  {
    label: 'Services',
    href: '/dashboard/services',
    icon: Scissors,
    section: 'salon',
  },
  {
    label: 'Staff',
    href: '/dashboard/staff',
    icon: Users,
    section: 'salon',
  },
  {
    label: 'Customers',
    href: '/dashboard/customers',
    icon: User,
    section: 'salon',
  },
  {
    label: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
    section: 'communication',
  },
  {
    label: 'Templates',
    href: '/dashboard/templates',
    icon: FileText,
    section: 'communication',
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    section: 'insights',
  },
  {
    label: 'My Salon',
    href: '/dashboard/salon',
    icon: Store,
    section: 'account',
  },
  {
    label: 'WhatsApp',
    href: '/dashboard/whatsapp',
    icon: MessageSquare,
    section: 'account',
  },
  {
    label: 'Profile',
    href: '/dashboard/profile',
    icon: User,
    section: 'account',
  },
  {
    label: 'System',
    href: '/dashboard/system',
    icon: Activity,
    section: 'admin',
  },
];

// Group navigation items by section
const navSections = [
  { id: 'overview', label: null },
  { id: 'salon', label: 'Salon Management' },
  { id: 'communication', label: 'Communication' },
  { id: 'insights', label: 'Insights' },
  { id: 'account', label: 'Account' },
  { id: 'admin', label: 'Admin' },
];

export function Sidebar() {
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
          'fixed left-0 top-0 z-50 h-screen w-64 transform border-r border-neutral-200 bg-white transition-transform duration-300 lg:translate-x-0 lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo and close button */}
          <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-neutral-900">WhatsApp SaaS</span>
            </Link>

            <button
              onClick={toggleSidebar}
              className="lg:hidden rounded-md p-2 hover:bg-neutral-100"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4" aria-label="Main navigation">
            {navSections.map((section) => {
              const sectionItems = navItems.filter((item) => item.section === section.id);

              if (sectionItems.length === 0) return null;

              return (
                <div key={section.id} className="mb-6">
                  {section.label && (
                    <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {section.label}
                    </h3>
                  )}
                  <ul className="space-y-1">
                    {sectionItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      const Icon = item.icon;

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
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
                </div>
              );
            })}
          </nav>

          {/* User profile section */}
          <div className="border-t border-neutral-200 p-4">
            <div className="flex items-center gap-3 rounded-md px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || 'User'}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
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
