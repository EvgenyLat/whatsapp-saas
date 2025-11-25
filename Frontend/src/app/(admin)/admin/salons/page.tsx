/**
 * Admin Salons Management Page
 * List, create, edit, and manage all salons
 */

'use client';

import * as React from 'react';
import { Plus, MoreVertical, Eye, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Salon {
  id: string;
  name: string;
  phone_number_id: string;
  is_active: boolean;
  created_at: string;
  total_users: number;
  total_bookings: number;
}

export default function AdminSalonsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedSalon, setSelectedSalon] = React.useState<Salon | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  // TODO: Replace with actual API call
  const mockSalons: Salon[] = [
    {
      id: '1',
      name: 'Bella Beauty Spa',
      phone_number_id: '1234567890',
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
      total_users: 12,
      total_bookings: 456,
    },
    {
      id: '2',
      name: 'Glamour Studio',
      phone_number_id: '0987654321',
      is_active: true,
      created_at: '2024-02-20T14:30:00Z',
      total_users: 8,
      total_bookings: 234,
    },
    {
      id: '3',
      name: 'Elite Hair Salon',
      phone_number_id: '1122334455',
      is_active: false,
      created_at: '2024-03-10T09:15:00Z',
      total_users: 5,
      total_bookings: 89,
    },
  ];

  const columns: Column<Salon>[] = [
    {
      key: 'name',
      label: 'Salon Name',
      sortable: true,
      render: (salon) => (
        <div>
          <p className="font-medium text-neutral-900">{salon.name}</p>
          <p className="text-xs text-neutral-500">ID: {salon.id.substring(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: 'phone_number_id',
      label: 'Phone Number ID',
      sortable: false,
      render: (salon) => (
        <span className="font-mono text-sm text-neutral-700">{salon.phone_number_id}</span>
      ),
    },
    {
      key: 'total_users',
      label: 'Users',
      sortable: true,
      render: (salon) => (
        <span className="text-neutral-900">{salon.total_users}</span>
      ),
    },
    {
      key: 'total_bookings',
      label: 'Bookings',
      sortable: true,
      render: (salon) => (
        <span className="text-neutral-900">{salon.total_bookings}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (salon) => (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            salon.is_active
              ? 'bg-success-100 text-success-700'
              : 'bg-neutral-200 text-neutral-700'
          )}
        >
          {salon.is_active ? (
            <>
              <Power className="h-3 w-3" />
              Active
            </>
          ) : (
            <>
              <PowerOff className="h-3 w-3" />
              Inactive
            </>
          )}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (salon) => (
        <span className="text-sm text-neutral-600">
          {format(new Date(salon.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
  ];

  const handleToggleActive = (salon: Salon) => {
    // TODO: Implement API call to toggle salon active status
    console.log('Toggle active:', salon.id);
  };

  const handleEdit = (salon: Salon) => {
    // TODO: Implement edit modal
    setSelectedSalon(salon);
    console.log('Edit salon:', salon.id);
  };

  const handleDelete = (salon: Salon) => {
    // TODO: Implement delete confirmation and API call
    if (window.confirm(`Are you sure you want to delete "${salon.name}"? This action cannot be undone.`)) {
      console.log('Delete salon:', salon.id);
    }
  };

  const handleViewDetails = (salon: Salon) => {
    // TODO: Navigate to salon details page
    console.log('View details:', salon.id);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Salons Management</h1>
          <p className="mt-2 text-neutral-600">
            Manage all salons on the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5" />
          Create Salon
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Total Salons</p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">{mockSalons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Active Salons</p>
            <p className="mt-2 text-3xl font-bold text-success-600">
              {mockSalons.filter((s) => s.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Inactive Salons</p>
            <p className="mt-2 text-3xl font-bold text-neutral-600">
              {mockSalons.filter((s) => !s.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Salons table */}
      <DataTable
        data={mockSalons}
        columns={columns}
        searchable
        searchPlaceholder="Search salons..."
        onSearch={setSearchQuery}
        pagination={{
          page,
          limit: 10,
          total: mockSalons.length,
          onPageChange: setPage,
        }}
        actions={(salon) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewDetails(salon)}
              className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEdit(salon)}
              className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleToggleActive(salon)}
              className={cn(
                'rounded-md p-2 hover:bg-neutral-100',
                salon.is_active ? 'text-success-600' : 'text-neutral-400'
              )}
              title={salon.is_active ? 'Deactivate' : 'Activate'}
            >
              {salon.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleDelete(salon)}
              className="rounded-md p-2 text-error-600 hover:bg-error-50"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
        emptyMessage="No salons found"
      />

      {/* TODO: Add Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Salon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">Create salon form will be implemented here.</p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="mt-4 rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-300"
              >
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
