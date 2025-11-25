/**
 * Header Component
 * Top header with breadcrumbs and user menu
 */

'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';

interface HeaderProps {
  className?: string;
}

/**
 * Generates breadcrumbs from the current pathname
 */
function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return { label, href };
  });

  return breadcrumbs;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-neutral-200 bg-white',
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-6">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2">
          <ol className="flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <li key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight
                      className="h-4 w-4 text-neutral-400"
                      aria-hidden="true"
                    />
                  )}
                  {isLast ? (
                    <span className="text-sm font-medium text-neutral-900">
                      {crumb.label}
                    </span>
                  ) : (
                    <a
                      href={crumb.href}
                      className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
                    >
                      {crumb.label}
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Search (placeholder) */}
        <div className="hidden md:block w-64">
          <Input
            type="search"
            placeholder="Search..."
            inputSize="sm"
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>
    </header>
  );
}
