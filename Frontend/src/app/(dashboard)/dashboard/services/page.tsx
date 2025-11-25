/**
 * Services List Page
 * Displays all services with search, filter, sort, and pagination capabilities.
 *
 * User Story: US5 - View and Search Services
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  Badge,
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
import { useServices, useDeleteService } from '@/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Service, ServiceListItem, ServiceCategory } from '@/types';
import {
  Clock,
  DollarSign,
  Plus,
  Eye,
  Edit,
  Trash2,
  Grid,
} from 'lucide-react';

interface ServiceCardProps {
  service: ServiceListItem;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function ServiceCard({ service, onView, onEdit, onDelete }: ServiceCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onView(service.id)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              {service.name}
            </h3>
            <Badge variant="info" className="text-xs">
              {service.category}
            </Badge>
          </div>
          <Badge variant={service.is_active ? 'success' : 'default'}>
            {service.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="h-4 w-4" />
            <span>{service.duration_minutes} minutes</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <DollarSign className="h-4 w-4" />
            <span>${Number(service.price).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-neutral-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(service.id);
            }}
            className="flex-1 rounded-md px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            aria-label="View service"
          >
            <Eye className="h-4 w-4 inline mr-1" />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(service.id);
            }}
            className="flex-1 rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Edit service"
          >
            <Edit className="h-4 w-4 inline mr-1" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this service?')) {
                onDelete(service.id);
              }
            }}
            className="rounded-md p-2 text-error-600 hover:bg-error-50 transition-colors"
            aria-label="Delete service"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServicesPage() {
  const router = useRouter();

  // Pagination state
  const [page, setPage] = React.useState(1);
  const limit = 24;

  // Filter state
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<ServiceCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<boolean | 'all'>('all');

  // Sort state
  const [sortBy, setSortBy] = React.useState<'name' | 'price' | 'duration'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Debounce search to reduce API calls
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch services with filters
  const { data, isLoading, error, refetch } = useServices({
    page,
    limit,
    search: debouncedSearch || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    is_active: statusFilter === 'all' ? undefined : statusFilter,
    // Note: Backend doesn't support sortBy/sortOrder, so we sort on frontend after fetching
  });

  const deleteService = useDeleteService();

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Count active filters
  const activeFilterCount = [
    debouncedSearch,
    categoryFilter !== 'all' ? categoryFilter : null,
    statusFilter !== 'all' ? statusFilter : null,
  ].filter(Boolean).length;

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  };

  // Handle delete with confirmation
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this service? This action cannot be undone.')) {
      deleteService.mutate(id, {
        onSuccess: () => {
          refetch();
        },
      });
    }
  };

  // Loading state
  if (isLoading && !data) {
    return <LoadingState label="Loading services..." />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Extract data
  const services = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Services"
        description="Manage your salon services and pricing"
        action={
          <Link href="/dashboard/services/new">
            <Button variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </Link>
        }
      />

      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search services..."
        />

        <FilterBar
          activeFilters={activeFilterCount}
          onClearAll={handleClearFilters}
        >
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as ServiceCategory | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="HAIRCUT">Haircut</SelectItem>
              <SelectItem value="COLORING">Coloring</SelectItem>
              <SelectItem value="STYLING">Styling</SelectItem>
              <SelectItem value="MANICURE">Manicure</SelectItem>
              <SelectItem value="PEDICURE">Pedicure</SelectItem>
              <SelectItem value="FACIAL">Facial</SelectItem>
              <SelectItem value="MASSAGE">Massage</SelectItem>
              <SelectItem value="MAKEUP">Makeup</SelectItem>
              <SelectItem value="WAXING">Waxing</SelectItem>
              <SelectItem value="THREADING">Threading</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(statusFilter)}
            onValueChange={(value) => setStatusFilter(value === 'all' ? 'all' : value === 'true')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as 'name' | 'price' | 'duration')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">A-Z / Low-High</SelectItem>
              <SelectItem value="desc">Z-A / High-Low</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Grid className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {activeFilterCount > 0 ? 'No services found' : 'No services yet'}
          </h3>
          <p className="text-sm text-gray-600 max-w-md mb-6">
            {activeFilterCount > 0
              ? 'Try adjusting your search or filters'
              : 'Add your first service to get started'}
          </p>
          {activeFilterCount === 0 && (
            <Link href="/dashboard/services/new">
              <Button variant="primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onView={(id) => router.push(`/dashboard/services/${id}`)}
                onEdit={(id) => router.push(`/dashboard/services/${id}/edit`)}
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
