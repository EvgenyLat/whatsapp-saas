/**
 * Auth Layout
 * Layout for authentication pages (login, register, etc.)
 */

import * as React from 'react';
import { MessageSquare } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 shadow-lg mb-4">
            <MessageSquare className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">WhatsApp SaaS</h1>
          <p className="text-neutral-600 mt-2 text-center">
            Salon Management Platform
          </p>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
