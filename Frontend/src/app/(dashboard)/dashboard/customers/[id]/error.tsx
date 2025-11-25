/**
 * Error State for Customer Detail Page
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button } from '@/components/ui';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  React.useEffect(() => {
    console.error('Customer detail page error:', error);
  }, [error]);

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Customers</span>
      </button>

      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-error-500" />
            <h2 className="mt-4 text-xl font-semibold text-error-600">
              Failed to Load Customer
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              {error.message || 'An unexpected error occurred while loading customer details.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
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
