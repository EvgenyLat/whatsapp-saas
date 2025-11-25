/**
 * Staff Member Detail Page
 * Displays detailed information about a staff member
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
import { staffApi, bookingsApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { StaffMember, Booking } from '@/types';
import {
  User,
  Phone,
  Mail,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Shield,
  Activity,
  TrendingUp,
} from 'lucide-react';

type TabType = 'overview' | 'schedule' | 'bookings' | 'performance';

interface StaffHeaderProps {
  staff: StaffMember;
  onDelete: () => void;
}

function StaffHeader({ staff, onDelete }: StaffHeaderProps) {
  const router = useRouter();


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 flex-shrink-0">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{staff.name}</h2>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-neutral-600">
                  <Phone className="h-4 w-4" />
                  <span>{staff.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-600">
                  <Mail className="h-4 w-4" />
                  <span>{staff.email}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={staff.is_active ? 'success' : 'default'}>
                  {staff.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/staff/${staff.id}/edit`}>
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
            <p className="text-sm text-neutral-600">Avg Rating</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">-</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Today's Schedule</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">0 bookings</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600">Week Completed</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">0 bookings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ staff }: { staff: StaffMember }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">Name</p>
            <p className="mt-1 text-neutral-900">{staff.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">Phone</p>
            <p className="mt-1 text-neutral-900">{staff.phone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">Email</p>
            <p className="mt-1 text-neutral-900">{staff.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">Status</p>
            <p className="mt-1 text-neutral-900">{staff.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">Member Since</p>
            <p className="mt-1 text-neutral-900">{formatDateTime(staff.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">Performance metrics will be available once bookings are tracked.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Activity className="mx-auto h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-neutral-600 font-medium">{title} Coming Soon</p>
        <p className="mt-2 text-sm text-neutral-500">
          This feature will be available in a future update
        </p>
      </CardContent>
    </Card>
  );
}

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;
  const salonId = useSalonIdSafe();

  const [staff, setStaff] = React.useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');

  React.useEffect(() => {
    if (!salonId) return;

    const fetchStaff = async () => {
      try {
        setIsLoading(true);
        const data = await staffApi.getById(salonId, staffId);
        setStaff(data);
      } catch (err) {
        console.error('Failed to fetch staff member:', err);
        setError('Failed to load staff member details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [salonId, staffId]);

  const handleDelete = async () => {
    if (!salonId) return;
    if (!window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return;
    }

    try {
      await staffApi.delete(salonId, staffId);
      router.push('/dashboard/staff');
    } catch (err) {
      console.error('Failed to delete staff member:', err);
      alert('Failed to delete staff member. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600">Loading staff details...</p>
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Failed to load staff member</p>
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
    { id: 'schedule', label: 'Schedule', icon: <Calendar className="h-4 w-4" /> },
    { id: 'bookings', label: 'Bookings', icon: <Calendar className="h-4 w-4" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Staff</span>
      </button>

      <StaffHeader staff={staff} onDelete={handleDelete} />

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

      <div>
        {activeTab === 'overview' && <OverviewTab staff={staff} />}
        {activeTab === 'schedule' && <PlaceholderTab title="Weekly Schedule" />}
        {activeTab === 'bookings' && <PlaceholderTab title="Bookings History" />}
        {activeTab === 'performance' && <PlaceholderTab title="Performance Metrics" />}
      </div>
    </div>
  );
}
