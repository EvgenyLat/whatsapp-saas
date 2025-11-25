/**
 * Footer Component
 * WhatsApp SaaS Platform
 *
 * Global footer with links and copyright information.
 */

'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface FooterProps {
  className?: string;
}

/**
 * Footer Component
 *
 * @example
 * <Footer />
 */
export const Footer = memo<FooterProps>(({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'border-t border-neutral-200 bg-white',
        'mt-auto',
        className,
      )}
    >
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Copyright */}
          <p className="text-sm text-neutral-600">
            © {currentYear} WhatsApp SaaS Platform. All rights reserved.
          </p>

          {/* Links */}
          <nav className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-neutral-600 transition-colors hover:text-primary-600"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-neutral-600 transition-colors hover:text-primary-600"
            >
              Terms of Service
            </Link>
            <Link
              href="/support"
              className="text-sm text-neutral-600 transition-colors hover:text-primary-600"
            >
              Support
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
