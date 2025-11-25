/**
 * Admin Users Management Page
 * List, view, and manage all users
 */

'use client';

import * as React from 'react';
import { Plus, Eye, Edit, UserX, Shield, User, Building2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'SALON_ADMIN' | 'SALON_STAFF';
  salon_id: string | null;
  salon_name?: string;
  isEmailVerified: boolean;
  created_at: string;
  last_login?: string;
}

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedUser, setSelectedUser] = React.useState<UserData | null>(null);

  // TODO: Replace with actual API call
  const mockUsers: UserData[] = [
    {
      id: '1',
      email: 'admin@platform.com',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      salon_id: null,
      isEmailVerified: true,
      created_at: '2024-01-01T00:00:00Z',
      last_login: '2024-03-20T10:30:00Z',
    },
    {
      id: '2',
      email: 'john@bellaspa.com',
      firstName: 'John',
      lastName: 'Smith',
      role: 'SALON_ADMIN',
      salon_id: '1',
      salon_name: 'Bella Beauty Spa',
      isEmailVerified: true,
      created_at: '2024-01-15T10:00:00Z',
      last_login: '2024-03-21T14:20:00Z',
    },
    {
      id: '3',
      email: 'sarah@glamourstudio.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'SALON_ADMIN',
      salon_id: '2',
      salon_name: 'Glamour Studio',
      isEmailVerified: true,
      created_at: '2024-02-20T14:30:00Z',
      last_login: '2024-03-19T09:15:00Z',
    },
    {
      id: '4',
      email: 'mike@bellaspa.com',
      firstName: 'Mike',
      lastName: 'Wilson',
      role: 'SALON_STAFF',
      salon_id: '1',
      salon_name: 'Bella Beauty Spa',
      isEmailVerified: false,
      created_at: '2024-03-01T11:00:00Z',
    },
  ];

  const getRoleBadgeColor = (role: UserData['role']) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-error-100 text-error-700';
      case 'SALON_ADMIN':
        return 'bg-primary-100 text-primary-700';
      case 'SALON_STAFF':
        return 'bg-neutral-200 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getRoleLabel = (role: UserData['role']) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'SALON_ADMIN':
        return 'Salon Admin';
      case 'SALON_STAFF':
        return 'Salon Staff';
      default:
        return role;
    }
  };

  const columns: Column<UserData>[] = [
    {
      key: 'email',
      label: 'User',
      sortable: true,
      render: (user) => (
        <div>
          <p className="font-medium text-neutral-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user) => (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            getRoleBadgeColor(user.role)
          )}
        >
          {user.role === 'SUPER_ADMIN' && <Shield className="h-3 w-3" />}
          {user.role !== 'SUPER_ADMIN' && <User className="h-3 w-3" />}
          {getRoleLabel(user.role)}
        </span>
      ),
    },
    {
      key: 'salon_name',
      label: 'Salon',
      sortable: true,
      render: (user) => (
        user.salon_name ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-neutral-400" />
            <span className="text-sm text-neutral-900">{user.salon_name}</span>
          </div>
        ) : (
          <span className="text-sm text-neutral-400">-</span>
        )
      ),
    },
    {
      key: 'isEmailVerified',
      label: 'Email Status',
      sortable: true,
      render: (user) => (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
            user.isEmailVerified
              ? 'bg-success-100 text-success-700'
              : 'bg-warning-100 text-warning-700'
          )}
        >
          {user.isEmailVerified ? 'Verified' : 'Unverified'}
        </span>
      ),
    },
    {
      key: 'last_login',
      label: 'Last Login',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-neutral-600">
          {user.last_login
            ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm')
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-neutral-600">
          {format(new Date(user.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
  ];

  const handleViewDetails = (user: UserData) => {
    // TODO: Navigate to user details page or open modal
    setSelectedUser(user);
    console.log('View user details:', user.id);
  };

  const handleEditUser = (user: UserData) => {
    // TODO: Implement edit user modal
    console.log('Edit user:', user.id);
  };

  const handleChangeRole = (user: UserData) => {
    // TODO: Implement role change modal
    console.log('Change role for user:', user.id);
  };

  const handleDeactivateUser = (user: UserData) => {
    // TODO: Implement deactivate user confirmation and API call
    if (window.confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`)) {
      console.log('Deactivate user:', user.id);
    }
  };

  const stats = {
    totalUsers: mockUsers.length,
    superAdmins: mockUsers.filter(u => u.role === 'SUPER_ADMIN').length,
    salonAdmins: mockUsers.filter(u => u.role === 'SALON_ADMIN').length,
    salonStaff: mockUsers.filter(u => u.role === 'SALON_STAFF').length,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Users Management</h1>
          <p className="mt-2 text-neutral-600">
            Manage all users across the platform
          </p>
        </div>
        <button
          onClick={() => console.log('Create user')}
          className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5" />
          Create User
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Total Users</p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Super Admins</p>
            <p className="mt-2 text-3xl font-bold text-error-600">{stats.superAdmins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Salon Admins</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{stats.salonAdmins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-neutral-600">Salon Staff</p>
            <p className="mt-2 text-3xl font-bold text-neutral-600">{stats.salonStaff}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <DataTable
        data={mockUsers}
        columns={columns}
        searchable
        searchPlaceholder="Search users by name or email..."
        onSearch={setSearchQuery}
        pagination={{
          page,
          limit: 10,
          total: mockUsers.length,
          onPageChange: setPage,
        }}
        actions={(user) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewDetails(user)}
              className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEditUser(user)}
              className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              title="Edit user"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleChangeRole(user)}
              className="rounded-md p-2 text-primary-600 hover:bg-primary-50"
              title="Change role"
            >
              <Shield className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeactivateUser(user)}
              className="rounded-md p-2 text-error-600 hover:bg-error-50"
              title="Deactivate user"
              disabled={user.role === 'SUPER_ADMIN'}
            >
              <UserX className="h-4 w-4" />
            </button>
          </div>
        )}
        emptyMessage="No users found"
      />
    </div>
  );
}
