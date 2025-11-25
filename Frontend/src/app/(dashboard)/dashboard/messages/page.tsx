/**
 * Messages Page
 * WhatsApp messages interface (placeholder)
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { MessageSquare, Construction } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Messages</h1>
        <p className="mt-2 text-neutral-600">
          WhatsApp messaging interface for customer communication
        </p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <Construction className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">
              Coming Soon
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              The messages feature is currently under development.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp integration will be available soon</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
