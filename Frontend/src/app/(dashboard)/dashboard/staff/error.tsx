'use client';

import { useEffect } from 'react';
import { Button, Card, CardContent } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Staff page error:', error);
  }, [error]);

  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <p className="text-error-600 font-medium">Failed to load staff</p>
          <p className="mt-2 text-sm text-neutral-500">
            {error.message || 'Something went wrong'}
          </p>
          <Button variant="primary" className="mt-4" onClick={reset}>
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
