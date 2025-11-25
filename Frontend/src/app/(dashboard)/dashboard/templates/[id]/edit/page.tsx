'use client';

import { TemplateStatus } from '@/types';
/**
 * Edit Template Page
 * Edit an existing WhatsApp message template
 *
 * Features:
 * - Pre-filled form with current template data
 * - Warning about re-approval requirement
 * - Shows current status
 */

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, Button, Input, LoadingSpinner, Badge } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdateTemplateRequest } from '@/types';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const templateId = params.id as string;

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => api.templates.getById(templateId),
    enabled: !!templateId,
  });

  const [status, setStatus] = React.useState<string>('');

  React.useEffect(() => {
    if (template) {
      setStatus(template.status);
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTemplateRequest) => api.templates.update(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
      router.push(`/dashboard/templates/${templateId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ status: status as any });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner  label="Loading template..." />
      </div>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Template not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost"  onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Edit Template</h1>
          <p className="mt-1 text-neutral-600">{template.name}</p>
        </div>
      </div>

      {/* Warning */}
      <Card className="border-warning-200 bg-warning-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning-900">
                Changes Require Re-approval
              </p>
              <p className="text-sm text-warning-800 mt-1">
                Any modifications to this template will require approval from WhatsApp before it can be used again.
                The template will be set to "Pending" status after saving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Template Status</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Current Status
                </label>
                <Badge variant={template.status === TemplateStatus.APPROVED ? 'success' : template.status === TemplateStatus.PENDING ? 'warning' : 'error' as any}>
                  {template.status}
                </Badge>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-neutral-700 mb-1">
                  New Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  Note: Only change the status if you have authority to do so.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Template Details (Read-Only)</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-500">Category</label>
                <p className="mt-1 text-neutral-900 capitalize">{template.category}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500">Language</label>
                <p className="mt-1 text-neutral-900 uppercase">{template.language}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500">Message Body</label>
                <div className="mt-1 rounded-md bg-neutral-50 border border-neutral-200 p-3">
                  <p className="text-sm text-neutral-900 whitespace-pre-wrap">{template.body}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>

          {updateMutation.isError && (
            <div className="rounded-md bg-error-50 border border-error-200 p-4">
              <p className="text-sm font-medium text-error-800">Failed to update template</p>
              <p className="text-sm text-error-700 mt-1">
                {updateMutation.error?.message || 'Please try again'}
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
