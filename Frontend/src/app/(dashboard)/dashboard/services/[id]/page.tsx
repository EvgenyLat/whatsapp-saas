/**
 * Service Detail Page
 * Displays detailed information about a service
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
import { servicesApi, bookingsApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Service } from '@/types';
import {
  Scissors,
  Clock,
  DollarSign,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  Users,
  Star,
} from 'lucide-react';

interface ServiceHeaderProps {
  service: Service;
  onDelete: () => void;
}

function ServiceHeader({ service, onDelete }: ServiceHeaderProps) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 flex-shrink-0">
              <Scissors className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{service.name}</h2>
              <div className="mt-2 space-y-1.5">
                <Badge variant="info">{service.category}</Badge>
                <Badge variant={service.is_active ? 'success' : 'default'} className="ml-2">
                  {service.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {service.description && (
                <p className="mt-3 text-neutral-600 max-w-2xl">{service.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/services/${service.id}/edit`}>
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

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Total Bookings</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">0</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Revenue</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">$0.00</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Avg Rating</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">-</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Popular Time</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">-</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  const salonId = useSalonIdSafe();

  const [service, setService] = React.useState<Service | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!salonId) return;

    const fetchService = async () => {
      try {
        setIsLoading(true);
        const data = await servicesApi.getById(serviceId);
        setService(data);
      } catch (err) {
        console.error('Failed to fetch service:', err);
        setError('Failed to load service details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [salonId, serviceId]);

  const handleDelete = async () => {
    if (!salonId) return;
    if (!window.confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      await servicesApi.delete(serviceId);
      router.push('/dashboard/services');
    } catch (err) {
      console.error('Failed to delete service:', err);
      alert('Failed to delete service. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Failed to load service</p>
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

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Services</span>
      </button>

      <ServiceHeader service={service} onDelete={handleDelete} />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-700">Name</p>
              <p className="mt-1 text-neutral-900">{service.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">Category</p>
              <p className="mt-1 text-neutral-900">{service.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">Duration</p>
              <p className="mt-1 text-neutral-900">{service.duration_minutes} minutes</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">Price</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                ${Number(service.price).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">Status</p>
              <p className="mt-1 text-neutral-900">
                {service.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">Created</p>
              <p className="mt-1 text-neutral-900">{formatDateTime(service.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Providing This Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">
              Staff assignment feature will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            No bookings found for this service yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
