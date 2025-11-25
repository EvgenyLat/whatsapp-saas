/**
 * Loading State for Customers List Page
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-48 bg-neutral-200 rounded animate-pulse"></div>
          <div className="h-5 w-72 bg-neutral-100 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-36 bg-neutral-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Filters skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 h-10 bg-neutral-100 rounded-md animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-10 w-[180px] bg-neutral-100 rounded-md animate-pulse"></div>
              <div className="h-10 w-[120px] bg-neutral-100 rounded-md animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse ml-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-neutral-200">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-neutral-200 rounded-full animate-pulse"></div>
                        <div className="h-5 w-32 bg-neutral-200 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 w-8 bg-neutral-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-7 w-7 bg-neutral-200 rounded animate-pulse"></div>
                        <div className="h-7 w-7 bg-neutral-200 rounded animate-pulse"></div>
                        <div className="h-7 w-7 bg-neutral-200 rounded animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
