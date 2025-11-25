/**
 * Staff List Page
 * Displays all staff members with search, filter, and pagination capabilities.
 *
 * User Story: US1 - View and Search Staff Members
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import {
  PageHeader,
  SearchBar,
  FilterBar,
  Pagination,
  ErrorState,
  LoadingState,
} from '@/components/shared';
import { StaffCard } from '@/components/staff/StaffCard';
import { useMasters, useDeleteMaster } from '@/hooks';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Plus, Users } from 'lucide-react';

export default function StaffPage() {
  const router = useRouter();
  const salonId = useSalonIdSafe();

  // Pagination state
  const [page, setPage] = React.useState(1);
  const limit = 20;

  // Filter state
  const [search, setSearch] = React.useState('');
  const [specializationFilter, setSpecializationFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'inactive' | 'all'>('all');

  // Debounce search to reduce API calls
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch staff with filters
  const { data, isLoading, error, refetch } = useMasters(salonId || '', {
    page,
    limit,
    search: debouncedSearch || undefined,
    specialization: specializationFilter === 'all' ? undefined : specializationFilter,
    is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  });

  const deleteMaster = useDeleteMaster(salonId || '');

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, specializationFilter, statusFilter]);

  // Count active filters
  const activeFilterCount = [
    debouncedSearch,
    specializationFilter !== 'all' ? specializationFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
  ].filter(Boolean).length;

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setSpecializationFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  // Handle delete with confirmation
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      deleteMaster.mutate(id, {
        onSuccess: () => {
          refetch();
        },
      });
    }
  };

  // Loading state
  if (isLoading && !data) {
    return <LoadingState label="Loading staff members..." />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Extract data
  const staff = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Staff Members"
        description="Manage your salon team"
        action={
          <Link href="/dashboard/staff/new">
            <Button variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </Link>
        }
      />

      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or phone..."
        />

        <FilterBar
          activeFilters={activeFilterCount}
          onClearAll={handleClearFilters}
        >
          <Select
            value={specializationFilter}
            onValueChange={(value) => setSpecializationFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Specializations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              <SelectItem value="HAIRSTYLIST">Hairstylist</SelectItem>
              <SelectItem value="MAKEUP_ARTIST">Makeup Artist</SelectItem>
              <SelectItem value="NAIL_TECHNICIAN">Nail Technician</SelectItem>
              <SelectItem value="MASSAGE_THERAPIST">Massage Therapist</SelectItem>
              <SelectItem value="ESTHETICIAN">Esthetician</SelectItem>
              <SelectItem value="BARBER">Barber</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'active' | 'inactive' | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      {/* Staff Grid */}
      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {activeFilterCount > 0 ? 'No staff found' : 'No staff members yet'}
          </h3>
          <p className="text-sm text-gray-600 max-w-md mb-6">
            {activeFilterCount > 0
              ? 'Try adjusting your search or filters'
              : 'Add your first staff member to get started'}
          </p>
          {activeFilterCount === 0 && (
            <Link href="/dashboard/staff/new">
              <Button variant="primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member) => (
              <StaffCard
                key={member.id}
                staff={member}
                onView={(id) => router.push(`/dashboard/staff/${id}`)}
                onEdit={(id) => router.push(`/dashboard/staff/${id}/edit`)}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
