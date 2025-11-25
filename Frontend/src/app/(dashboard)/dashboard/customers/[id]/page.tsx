/**
 * Customer Detail Page
 * Displays detailed customer information with tabs for overview, bookings, messages, and activity
 */

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from '@/components/ui';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { customersApi, bookingsApi, messagesApi } from '@/lib/api';
import { formatDateTime, formatPhoneNumber } from '@/lib/utils';
import type { CustomerProfile, Booking, Message } from '@/types';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Activity,
  TrendingUp,
} from 'lucide-react';

type TabType = 'overview' | 'bookings' | 'messages' | 'activity';

interface CustomerHeaderProps {
  customer: CustomerProfile;
  onDelete: () => void;
}

function CustomerHeader({ customer, onDelete }: CustomerHeaderProps) {
  const router = useRouter();

  const handleSendMessage = () => {
    window.open(
      `https://wa.me/${customer.phone_number.replace(/[^0-9]/g, '')}`,
      '_blank'
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 flex-shrink-0">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">
                {customer.name || 'Unknown Customer'}
              </h2>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-neutral-600">
                  <Phone className="h-4 w-4" />
                  <span>{formatPhoneNumber(customer.phone_number)}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Customer since {formatDateTime(customer.first_seen)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleSendMessage}>
              <Send className="h-4 w-4" />
              Send Message
            </Button>
            <Link href={`/dashboard/customers/${customer.phone_number}/edit`}>
              <Button variant="secondary">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="danger" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Total Bookings</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {customer.total_bookings}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Total Messages</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {customer.total_messages}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Last Visit</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              {formatDateTime(customer.last_seen)}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Favorite Service</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              {customer.favorite_service || 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface OverviewTabProps {
  customer: CustomerProfile;
}

function OverviewTab({ customer }: OverviewTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">Phone Number</p>
            <p className="mt-1 text-neutral-900">
              {formatPhoneNumber(customer.phone_number)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">Name</p>
            <p className="mt-1 text-neutral-900">{customer.name || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">First Seen</p>
            <p className="mt-1 text-neutral-900">
              {formatDateTime(customer.first_seen)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">Last Seen</p>
            <p className="mt-1 text-neutral-900">
              {formatDateTime(customer.last_seen)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-700">Total Bookings</span>
            <span className="text-lg font-semibold text-neutral-900">
              {customer.total_bookings}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-700">Total Messages</span>
            <span className="text-lg font-semibold text-neutral-900">
              {customer.total_messages}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-700">Favorite Service</span>
            <span className="text-sm font-medium text-neutral-900">
              {customer.favorite_service || 'N/A'}
            </span>
          </div>
          {customer.lifetime_value !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">Lifetime Value</span>
              <span className="text-lg font-semibold text-primary-600">
                ${customer.lifetime_value.toFixed(2)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface BookingsTabProps {
  customerId: string;
  salonId: string;
}

function BookingsTab({ customerId, salonId }: BookingsTabProps) {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!salonId) return;

    const fetchBookings = async () => {
      try {
        const response = await bookingsApi.getAll(salonId, {
          customer_phone: customerId,
          sortOrder: 'desc',
        });
        setBookings(response.data);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [salonId, customerId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-4 text-neutral-600 font-medium">No bookings found</p>
          <p className="mt-2 text-sm text-neutral-500">
            This customer hasn't made any bookings yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-neutral-900">{booking.service}</h4>
                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateTime(booking.start_ts)}</span>
                  </div>
                  <Badge variant={booking.status as any}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <Link href={`/dashboard/bookings/${booking.id}`}>
                <Button variant="outline" >
                  View Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface MessagesTabProps {
  customerId: string;
  salonId: string;
}

function MessagesTab({ customerId, salonId }: MessagesTabProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!salonId) return;

    const fetchMessages = async () => {
      try {
        const response = await messagesApi.getAll(salonId, {
          phone_number: customerId,
          sortOrder: 'desc',
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [salonId, customerId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-4 text-neutral-600 font-medium">No messages found</p>
          <p className="mt-2 text-sm text-neutral-500">
            No messages have been exchanged with this customer yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <Card key={message.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                  message.direction === 'INBOUND'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant={message.direction === 'INBOUND' ? 'info' : 'success'}>
                    {message.direction}
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    {formatDateTime(message.created_at)}
                  </span>
                </div>
                <p className="text-sm text-neutral-900">{message.content}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityTab({ customerId }: { customerId: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Activity className="mx-auto h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-neutral-600 font-medium">Activity Log Coming Soon</p>
        <p className="mt-2 text-sm text-neutral-500">
          Detailed activity tracking will be available in a future update
        </p>
      </CardContent>
    </Card>
  );
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const salonId = useSalonIdSafe();

  const [customer, setCustomer] = React.useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');

  React.useEffect(() => {
    if (!salonId) return;

    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        const data = await customersApi.getById(salonId, customerId);
        setCustomer(data);
      } catch (err) {
        console.error('Failed to fetch customer:', err);
        setError('Failed to load customer details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [salonId, customerId]);

  const handleDelete = async () => {
    if (!salonId) return;
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      await customersApi.delete(salonId, customerId);
      router.push('/dashboard/customers');
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert('Failed to delete customer. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Failed to load customer</p>
            <p className="mt-2 text-sm text-neutral-500">{error}</p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'bookings', label: 'Bookings', icon: <Calendar className="h-4 w-4" /> },
    { id: 'messages', label: 'Messages', icon: <MessageCircle className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Customers</span>
      </button>

      {/* Customer header */}
      <CustomerHeader customer={customer} onDelete={handleDelete} />

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <OverviewTab customer={customer} />}
        {activeTab === 'bookings' && <BookingsTab customerId={customerId} salonId={salonId || ''} />}
        {activeTab === 'messages' && <MessagesTab customerId={customerId} salonId={salonId || ''} />}
        {activeTab === 'activity' && <ActivityTab customerId={customerId} />}
      </div>
    </div>
  );
}
