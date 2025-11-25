/**
 * Customers List Page
 * Displays all customers with search, filter, and pagination
 */

'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { customersApi } from '@/lib/api';
import { formatDateTime, formatPhoneNumber } from '@/lib/utils';
import type { CustomerListItem } from '@/types';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  UserCircle,
  Filter,
} from 'lucide-react';

interface CustomersTableProps {
  customers: CustomerListItem[];
  onDelete: (id: string) => void;
}

function CustomersTable({ customers, onDelete }: CustomersTableProps) {
  const router = useRouter();

  if (customers.length === 0) {
    return (
      <div className="py-12 text-center">
        <UserCircle className="mx-auto h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-neutral-600 font-medium">No customers found</p>
        <p className="mt-2 text-sm text-neutral-500">
          Add your first customer to get started
        </p>
        <Link href="/dashboard/customers/new" className="mt-4 inline-block">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Total Bookings
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Last Visit
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Status
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.phone_number}
                className="border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                onClick={() => router.push(`/dashboard/customers/${customer.phone_number}`)}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">
                        {customer.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{formatPhoneNumber(customer.phone_number)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-neutral-900">
                    {customer.total_bookings}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-neutral-600">
                    {formatDateTime(customer.last_seen)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Badge variant={customer.total_bookings > 0 ? 'success' : 'default'}>
                    {customer.total_bookings > 0 ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/customers/${customer.phone_number}`);
                      }}
                      className="rounded-md p-1.5 text-primary-600 hover:bg-primary-50"
                      aria-label="View customer"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/customers/${customer.phone_number}/edit`);
                      }}
                      className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
                      aria-label="Edit customer"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            'Are you sure you want to delete this customer? This action cannot be undone.'
                          )
                        ) {
                          onDelete(customer.phone_number);
                        }
                      }}
                      className="rounded-md p-1.5 text-error-600 hover:bg-error-50"
                      aria-label="Delete customer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-4">
        {customers.map((customer) => (
          <Card
            key={customer.phone_number}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/dashboard/customers/${customer.phone_number}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 flex-shrink-0">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-neutral-900 truncate">
                      {customer.name || 'Unknown'}
                    </h3>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {formatPhoneNumber(customer.phone_number)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <span>{customer.total_bookings} bookings</span>
                        <span>•</span>
                        <span>{formatDateTime(customer.last_seen)}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge variant={customer.total_bookings > 0 ? 'success' : 'default'}>
                        {customer.total_bookings > 0 ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/customers/${customer.phone_number}/edit`);
                    }}
                    className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
                    aria-label="Edit customer"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          'Are you sure you want to delete this customer?'
                        )
                      ) {
                        onDelete(customer.phone_number);
                      }
                    }}
                    className="rounded-md p-1.5 text-error-600 hover:bg-error-50"
                    aria-label="Delete customer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

/**
 * Loading fallback component for Suspense boundary
 */
function CustomersLoading(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Customers</h1>
          <p className="mt-2 text-neutral-600">Manage your customer database</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <LoadingSpinner variant="primary" />
            <p className="text-sm text-neutral-600">Loading customers page...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Customers Page Content Component
 * Separated to allow Suspense wrapping of useSearchParams
 */
function CustomersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salonId = useSalonIdSafe();

  const [customers, setCustomers] = React.useState<CustomerListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'total_bookings' | 'last_seen'>('last_seen');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  // Fetch customers
  const fetchCustomers = React.useCallback(async () => {
    if (!salonId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await customersApi.getAll(salonId, {
        page,
        limit,
        search: search || undefined,
        sortBy,
        sortOrder,
      });

      setCustomers(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [salonId, page, limit, search, sortBy, sortOrder]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async (customerId: string) => {
    if (!salonId) return;

    try {
      await customersApi.delete(salonId, customerId);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert('Failed to delete customer. Please try again.');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-error-600 font-medium">Failed to load customers</p>
            <p className="mt-2 text-sm text-neutral-500">{error}</p>
            <Button variant="primary" className="mt-4" onClick={fetchCustomers}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Customers</h1>
          <p className="mt-2 text-neutral-600">Manage your customer database</p>
        </div>
        <Link href="/dashboard/customers/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Filters and search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={handleSearchChange}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_seen">Last Visit</SelectItem>
                  <SelectItem value="total_bookings">Total Bookings</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers table/cards */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
              <p className="mt-4 text-neutral-600">Loading customers...</p>
            </div>
          ) : (
            <CustomersTable customers={customers} onDelete={handleDelete} />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
            customers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-neutral-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Customers Page
 * Wraps content in Suspense boundary for useSearchParams compatibility
 */
export default function CustomersPage(): React.JSX.Element {
  return (
    <Suspense fallback={<CustomersLoading />}>
      <CustomersContent />
    </Suspense>
  );
}
