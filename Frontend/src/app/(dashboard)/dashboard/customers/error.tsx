/**
 * Error State for Customers List Page
 */

'use client';

import * as React from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { AlertCircle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    console.error('Customers page error:', error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Customers</h1>
        <p className="mt-2 text-neutral-600">Manage your customer database</p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-error-500" />
            <h2 className="mt-4 text-xl font-semibold text-error-600">
              Failed to Load Customers
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              {error.message || 'An unexpected error occurred while loading customers.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button variant="primary" onClick={reset}>
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
