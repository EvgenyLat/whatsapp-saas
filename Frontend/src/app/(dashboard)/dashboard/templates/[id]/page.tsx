/**
 * Template Detail Page
 * View WhatsApp message template details, stats, and history
 *
 * Features:
 * - Template information with status badge
 * - Full message preview with highlighted variables
 * - Usage statistics (sent, delivery, read, response rates)
 * - Edit and Delete buttons
 * - Test Send functionality
 * - Approval status history
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, Badge, LoadingSpinner, Button } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/formatters';
import type { Template } from '@/types';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Eye,
  TrendingUp,
  Mail,
} from 'lucide-react';

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const templateId = params.id as string;

  const { data: template, isLoading, error } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => api.templates.getById(templateId),
    enabled: !!templateId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.templates.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      router.push('/dashboard/templates');
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleTestSend = () => {
    // TODO: Implement test send dialog
    alert('Test send functionality coming soon!');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner  label="Loading template..." />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-error-600 font-medium">Template not found</p>
              <p className="mt-2 text-sm text-neutral-500">
                The template you're looking for doesn't exist or has been deleted
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        return <CheckCircle className="h-5 w-5" />;
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'rejected':
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  // Highlight variables in template body ({{1}}, {{2}}, etc.)
  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, index) => {
      if (/\{\{\d+\}\}/.test(part)) {
        return (
          <span key={index} className="bg-primary-100 text-primary-700 px-1 rounded font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{template.name}</h1>
            <p className="mt-1 text-neutral-600">
              Template Details & Statistics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            
            onClick={handleTestSend}
          >
            <Send className="h-4 w-4" />
            Test Send
          </Button>
          <Button
            variant="secondary"
            
            onClick={() => router.push(`/dashboard/templates/${templateId}/edit`)}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="danger"
            
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Template Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-500">Category</label>
                  <p className="mt-1 text-neutral-900 capitalize">{template.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">Language</label>
                  <p className="mt-1 text-neutral-900 uppercase">{template.language}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(template.status) as any} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(template.status)}
                      {template.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">Created</label>
                  <p className="mt-1 text-neutral-900">{formatDateTime(template.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-neutral-500" />
                <h2 className="text-lg font-semibold text-neutral-900">Message Preview</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-neutral-200 bg-white p-4 max-w-md">
                {/* WhatsApp-style message bubble */}
                <div className="rounded-lg bg-neutral-50 p-3 shadow-sm">
                  {template.header && (
                    <div className="mb-3 pb-3 border-b border-neutral-200">
                      <p className="font-semibold text-neutral-900">{template.header.content}</p>
                    </div>
                  )}
                  <div className="text-neutral-900 whitespace-pre-wrap">
                    {highlightVariables(template.body)}
                  </div>
                  {template.footer && (
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <p className="text-xs text-neutral-500">{template.footer}</p>
                    </div>
                  )}
                  {template.buttons && template.buttons.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {template.buttons.map((button, index) => (
                        <button
                          key={index}
                          className="w-full rounded-md bg-white border border-primary-500 text-primary-600 py-2 text-sm font-medium hover:bg-primary-50 transition-colors"
                        >
                          {button.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-neutral-400 text-right">WhatsApp</p>
              </div>
            </CardContent>
          </Card>

          {/* Approval History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Approval History</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100">
                    <CheckCircle className="h-4 w-4 text-success-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">Template Created</p>
                    <p className="text-sm text-neutral-600">
                      Template was created and submitted for approval
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {formatDateTime(template.created_at)}
                    </p>
                  </div>
                </div>
                {template.status.toLowerCase() === 'approved' && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-success-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100">
                      <CheckCircle className="h-4 w-4 text-success-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-success-900">Template Approved</p>
                      <p className="text-sm text-success-700">
                        Template was approved by WhatsApp and is ready to use
                      </p>
                      <p className="text-xs text-success-600 mt-1">
                        {formatDateTime(template.updated_at)}
                      </p>
                    </div>
                  </div>
                )}
                {template.status.toLowerCase() === 'rejected' && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-error-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error-100">
                      <XCircle className="h-4 w-4 text-error-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-error-900">Template Rejected</p>
                      <p className="text-sm text-error-700">
                        Template was rejected by WhatsApp. Please review and resubmit.
                      </p>
                      <p className="text-xs text-error-600 mt-1">
                        {formatDateTime(template.updated_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          {template.stats && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-900">Statistics</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-600">Total Sent</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">
                    {template.stats.totalSent.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Delivery Rate</span>
                      <span className="text-sm font-bold text-success-600">
                        {template.stats.deliveryRate}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full bg-success-500 transition-all"
                        style={{ width: `${template.stats.deliveryRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Read Rate</span>
                      <span className="text-sm font-bold text-primary-600">
                        {template.stats.readRate}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${template.stats.readRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Response Rate</span>
                      <span className="text-sm font-bold text-neutral-700">
                        {template.stats.responseRate}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full bg-neutral-500 transition-all"
                        style={{ width: `${template.stats.responseRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Quick Actions</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={handleTestSend}
              >
                <Send className="h-4 w-4" />
                Send Test Message
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push(`/dashboard/templates/${templateId}/edit`)}
              >
                <Edit2 className="h-4 w-4" />
                Edit Template
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/messages')}
              >
                <MessageSquare className="h-4 w-4" />
                View Messages
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
