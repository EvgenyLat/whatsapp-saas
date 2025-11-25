/**
 * Templates List Page
 * WhatsApp Message Templates Management
 *
 * Features:
 * - Card grid view (2 columns)
 * - Filter by status and category
 * - Search by name
 * - Template preview
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, Badge, LoadingSpinner, Button, Input } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/formatters';
import type { Template } from '@/types';
import { Search, Plus, FileText, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSalonIdSafe } from '@/hooks/useSalonId';

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary-300"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <MessageSquare className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">{template.name}</h3>
              <p className="text-sm text-neutral-500 capitalize">{template.category}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={getStatusColor(template.status) as any} className="flex items-center gap-1">
              {getStatusIcon(template.status)}
              {template.status}
            </Badge>
            <span className="text-xs text-neutral-500 uppercase">{template.language}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Preview */}
          <div className="rounded-md bg-neutral-50 p-3 border border-neutral-200">
            <p className="text-sm text-neutral-700 line-clamp-3">
              {template.body}
            </p>
          </div>

          {/* Stats (if available) */}
          {template.stats && (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-200">
              <div className="text-center">
                <p className="text-xs text-neutral-500">Sent</p>
                <p className="text-sm font-semibold text-neutral-900">{template.stats.totalSent}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-500">Delivered</p>
                <p className="text-sm font-semibold text-success-600">
                  {template.stats.deliveryRate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-500">Read</p>
                <p className="text-sm font-semibold text-primary-600">
                  {template.stats.readRate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-500">Response</p>
                <p className="text-sm font-semibold text-neutral-700">
                  {template.stats.responseRate}%
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-200">
            <span>Created {formatDateTime(template.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const salonId = useSalonIdSafe();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['templates', salonId, { status: statusFilter, category: categoryFilter }],
    queryFn: () => api.templates.getAll(salonId || '', {
      status: statusFilter as any || undefined,
      // category: categoryFilter || undefined,
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter templates by search query locally
  const filteredTemplates = React.useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query)
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(template =>
        template.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    return filtered;
  }, [data?.data, searchQuery, categoryFilter]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner  label="Loading templates..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Failed to load templates</p>
            <p className="mt-2 text-sm text-neutral-500">
              Please try refreshing the page
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Message Templates</h1>
          <p className="mt-2 text-neutral-600">
            Manage WhatsApp message templates for customer communication
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/dashboard/templates/new')}
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search templates by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-700">Status:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatusFilter('')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      statusFilter === ''
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      statusFilter === 'approved'
                        ? 'bg-success-100 text-success-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      statusFilter === 'pending'
                        ? 'bg-warning-100 text-warning-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setStatusFilter('rejected')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      statusFilter === 'rejected'
                        ? 'bg-error-100 text-error-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Rejected
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-700">Category:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCategoryFilter('')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      categoryFilter === ''
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCategoryFilter('marketing')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      categoryFilter === 'marketing'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Marketing
                  </button>
                  <button
                    onClick={() => setCategoryFilter('utility')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      categoryFilter === 'utility'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Utility
                  </button>
                  <button
                    onClick={() => setCategoryFilter('authentication')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      categoryFilter === 'authentication'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Authentication
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-neutral-400" />
              <p className="mt-4 text-neutral-600 font-medium">No templates found</p>
              <p className="mt-2 text-sm text-neutral-500">
                {searchQuery || statusFilter || categoryFilter
                  ? 'Try adjusting your filters'
                  : 'Create your first template to get started'}
              </p>
              {!searchQuery && !statusFilter && !categoryFilter && (
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => router.push('/dashboard/templates/new')}
                >
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => router.push(`/dashboard/templates/${template.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
