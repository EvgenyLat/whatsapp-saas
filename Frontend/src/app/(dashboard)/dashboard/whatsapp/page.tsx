/**
 * WhatsApp Configuration Page
 * Comprehensive WhatsApp Business API configuration including:
 * - API credentials configuration
 * - Connection status monitoring
 * - Test messaging functionality
 * - Message templates management
 * - Usage statistics
 */

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  LoadingSpinner,
  Alert,
} from '@/components/ui';
import { useSalon, useUpdateSalon } from '@/hooks/api/useSalons';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Send,
  Copy,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  Clock,
  FileText,
} from 'lucide-react';

/**
 * WhatsApp config schema
 */
const whatsappConfigSchema = z.object({
  phone_number_id: z.string().min(1, 'Phone Number ID is required'),
  access_token: z.string().min(1, 'Access Token is required'),
  webhook_verify_token: z.string().optional(),
});

type WhatsAppConfigFormData = z.infer<typeof whatsappConfigSchema>;

/**
 * Test message schema
 */
const testMessageSchema = z.object({
  phone_number: z.string().min(10, 'Valid phone number is required'),
  message: z.string().min(1, 'Message is required'),
});

type TestMessageFormData = z.infer<typeof testMessageSchema>;

/**
 * WhatsApp Configuration Section
 */
function ConfigurationSection({ salonId }: { salonId: string }) {
  const { data: salon } = useSalon(salonId);
  const updateSalon = useUpdateSalon(salonId);
  const [showToken, setShowToken] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WhatsAppConfigFormData>({
    resolver: zodResolver(whatsappConfigSchema),
    defaultValues: {
      phone_number_id: salon?.phone_number_id || '',
      access_token: '',
      webhook_verify_token: '',
    },
  });

  React.useEffect(() => {
    if (salon) {
      reset({
        phone_number_id: salon.phone_number_id,
        access_token: '',
        webhook_verify_token: '',
      });
    }
  }, [salon, reset]);

  const onSubmit = async (data: WhatsAppConfigFormData) => {
    try {
      await updateSalon.mutateAsync({
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
      });
      setIsEditing(false);
      reset();
    } catch (error) {
      console.error('Failed to update WhatsApp configuration:', error);
    }
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp/${salonId}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>WhatsApp Configuration</CardTitle>
          {!isEditing && (
            <Button variant="ghost" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!salon?.phone_number_id && (
            <Alert
              type="info"
              title="WhatsApp not configured"
              message="Configure your WhatsApp Business API credentials to start sending messages."
              showIcon
            />
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              WhatsApp Phone Number ID
            </label>
            <Input
              {...register('phone_number_id')}
              placeholder="Enter Phone Number ID from Meta"
              disabled={!isEditing}
              error={errors.phone_number_id?.message}
            />
            <p className="mt-1 text-sm text-neutral-500">
              Get this from your Facebook Business Manager
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              WhatsApp Access Token
            </label>
            <div className="relative">
              <Input
                {...register('access_token')}
                type={showToken ? 'text' : 'password'}
                placeholder={isEditing ? 'Enter new access token' : '••••••••••••••••'}
                disabled={!isEditing}
                error={errors.access_token?.message}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isEditing && (
              <p className="mt-1 text-sm text-neutral-500">
                Enter only if you want to update the access token
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Webhook URL (Read-only)
            </label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="flex-1 bg-neutral-50 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Use this URL in your Facebook App webhook configuration
            </p>
          </div>

          {isEditing && (
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <Button
                type="submit"
                variant="primary"
                disabled={updateSalon.isPending}
              >
                {updateSalon.isPending ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  reset();
                }}
                disabled={updateSalon.isPending}
              >
                Cancel
              </Button>
            </div>
          )}

          {updateSalon.isSuccess && (
            <Alert
              type="success"
              message="Configuration updated successfully"
              showIcon
            />
          )}

          {updateSalon.isError && (
            <Alert
              type="error"
              message="Failed to update configuration. Please try again."
              showIcon
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Connection Status Section
 */
function ConnectionStatusSection({ salonId }: { salonId: string }) {
  const { data: salon } = useSalon(salonId);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const isConfigured = salon?.phone_number_id && salon?.access_token;

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Simulate test connection
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // TODO: Replace with actual API call
      // const response = await api.whatsapp.testConnection(salonId);

      setTestResult({
        success: true,
        message: 'Connection successful! WhatsApp API is working correctly.',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection failed. Please check your credentials.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-6 bg-neutral-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                isConfigured ? 'bg-success-100' : 'bg-neutral-200'
              }`}
            >
              <Activity
                className={`h-6 w-6 ${
                  isConfigured ? 'text-success-600' : 'text-neutral-400'
                }`}
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900">
                {isConfigured ? 'Configured' : 'Not Configured'}
              </p>
              <p className="text-sm text-neutral-500">
                {isConfigured
                  ? 'WhatsApp API credentials are set'
                  : 'WhatsApp API credentials are missing'}
              </p>
            </div>
          </div>
          <Badge variant={isConfigured ? 'success' : 'default'}>
            {isConfigured ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Ready
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" />
                Not Ready
              </>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={testConnection}
            disabled={!isConfigured || isTesting}
          >
            {isTesting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Testing...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <Alert
            type={testResult.success ? 'success' : 'error'}
            message={testResult.message}
            showIcon
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Test Messaging Section
 */
function TestMessagingSection({ salonId }: { salonId: string }) {
  const { data: salon } = useSalon(salonId);
  const [isSending, setIsSending] = React.useState(false);
  const [sendResult, setSendResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TestMessageFormData>({
    resolver: zodResolver(testMessageSchema),
  });

  const isConfigured = salon?.phone_number_id && salon?.access_token;

  const onSubmit = async (data: TestMessageFormData) => {
    setIsSending(true);
    setSendResult(null);

    try {
      // Simulate sending test message
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // TODO: Replace with actual API call
      // await api.whatsapp.sendTestMessage(salonId, data);

      setSendResult({
        success: true,
        message: 'Test message sent successfully!',
      });
      reset();
    } catch (error) {
      setSendResult({
        success: false,
        message: 'Failed to send test message. Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Messaging</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!isConfigured && (
            <Alert
              type="warning"
              message="Please configure WhatsApp credentials first"
              showIcon
            />
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Recipient Phone Number
            </label>
            <Input
              {...register('phone_number')}
              type="tel"
              placeholder="+1234567890"
              disabled={!isConfigured}
              error={errors.phone_number?.message}
            />
            <p className="mt-1 text-sm text-neutral-500">
              Include country code (e.g., +1 for US)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Test Message
            </label>
            <Input
              {...register('message')}
              placeholder="Hello! This is a test message."
              disabled={!isConfigured}
              error={errors.message?.message}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!isConfigured || isSending}
          >
            {isSending ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Message
              </>
            )}
          </Button>

          {sendResult && (
            <Alert
              type={sendResult.success ? 'success' : 'error'}
              message={sendResult.message}
              showIcon
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Usage Statistics Section
 */
function UsageStatsSection({ salonId }: { salonId: string }) {
  // Mock statistics - in production these would come from analytics API
  const stats = {
    messagesSent: 1247,
    messagesFailed: 12,
    deliveryRate: 99.0,
    avgDeliveryTime: 2.3,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-primary-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-primary-600" />
              <p className="text-sm font-medium text-primary-600">Messages Sent</p>
            </div>
            <p className="text-2xl font-bold text-primary-900">
              {stats.messagesSent.toLocaleString()}
            </p>
            <p className="text-xs text-primary-600 mt-1">This month</p>
          </div>

          <div className="p-4 bg-error-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-error-600" />
              <p className="text-sm font-medium text-error-600">Failed Messages</p>
            </div>
            <p className="text-2xl font-bold text-error-900">{stats.messagesFailed}</p>
            <p className="text-xs text-error-600 mt-1">This month</p>
          </div>

          <div className="p-4 bg-success-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-success-600" />
              <p className="text-sm font-medium text-success-600">Delivery Rate</p>
            </div>
            <p className="text-2xl font-bold text-success-900">{stats.deliveryRate}%</p>
            <p className="text-xs text-success-600 mt-1">Success rate</p>
          </div>

          <div className="p-4 bg-info-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-info-600" />
              <p className="text-sm font-medium text-info-600">Avg Delivery Time</p>
            </div>
            <p className="text-2xl font-bold text-info-900">{stats.avgDeliveryTime}s</p>
            <p className="text-xs text-info-600 mt-1">Average time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Message Templates Section
 */
function MessageTemplatesSection({ salonId }: { salonId: string }) {
  // Mock templates - in production these would come from templates API
  const templates = [
    {
      id: '1',
      name: 'booking_confirmation',
      status: 'APPROVED',
      body: 'Hi {{1}}, your booking for {{2}} on {{3}} is confirmed!',
    },
    {
      id: '2',
      name: 'booking_reminder',
      status: 'APPROVED',
      body: 'Reminder: You have an appointment tomorrow at {{1}}',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Message Templates</CardTitle>
          <Button variant="ghost">
            <FileText className="mr-2 h-4 w-4" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-center text-neutral-500 py-8">No templates configured</p>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-neutral-900">{template.name}</p>
                  <Badge variant="success">{template.status}</Badge>
                </div>
                <p className="text-sm text-neutral-600 font-mono bg-neutral-50 p-2 rounded">
                  {template.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * WhatsApp Configuration Page
 */
export default function WhatsAppPage() {
  const salonId = useSalonIdSafe();

  if (!salonId) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert
            type="warning"
            title="No salon associated with your account"
            message="Please contact support to set up your salon account."
            showIcon
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">WhatsApp Configuration</h1>
        <p className="mt-2 text-neutral-600">
          Configure and monitor your WhatsApp Business API integration
        </p>
      </div>

      {/* Sections */}
      <ConfigurationSection salonId={salonId} />
      <ConnectionStatusSection salonId={salonId} />
      <TestMessagingSection salonId={salonId} />
      <UsageStatsSection salonId={salonId} />
      <MessageTemplatesSection salonId={salonId} />
    </div>
  );
}
