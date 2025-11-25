/**
 * Loading State for Customer Detail Page
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <div className="h-6 w-36 bg-neutral-200 rounded animate-pulse"></div>

      {/* Header skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 bg-neutral-200 rounded-full animate-pulse flex-shrink-0"></div>
              <div className="space-y-3">
                <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-neutral-100 rounded animate-pulse"></div>
                  <div className="h-4 w-44 bg-neutral-100 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-32 bg-neutral-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-neutral-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-neutral-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-neutral-50 rounded-lg p-4">
                <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                <div className="mt-2 h-8 w-16 bg-neutral-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div className="border-b border-neutral-200">
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-11 w-28 bg-neutral-100 rounded-t animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="h-6 w-32 bg-neutral-200 rounded animate-pulse"></div>
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 w-24 bg-neutral-100 rounded animate-pulse"></div>
                    <div className="h-5 w-40 bg-neutral-100 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
