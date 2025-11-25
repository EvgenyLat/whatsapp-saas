/**
 * Dashboard Layout
 * Layout for dashboard pages with sidebar and header
 * Simplified - only checks authentication, no onboarding flow
 */

'use client';

import * as React from 'react';
import { Sidebar, Header } from '@/components/layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <LoadingSpinner variant="primary" size="lg" />
          <p className="mt-4 text-sm text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
