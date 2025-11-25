/**
 * Test Components Page
 * WhatsApp SaaS Platform
 *
 * This page tests all newly created components to verify:
 * - Components render without errors
 * - Interactive states work correctly
 * - Responsive behavior is correct
 * - No console errors
 */

'use client';

import React, { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { BookingFilters, type BookingFilterState } from '@/components/features/bookings/BookingFilters';
import { MessageBubble } from '@/components/features/messages/MessageBubble';
import { Chart, type ChartDataPoint } from '@/components/features/analytics/Chart';
import { BookingCard } from '@/components/features/bookings/BookingCard';
import { LoginForm } from '@/components/forms/LoginForm';
import { BookingForm } from '@/components/forms/BookingForm';
import { Card } from '@/components/ui/Card';
import { BookingStatus, MessageStatus } from '@/types';
import type { Booking, CreateBookingInput } from '@/types';

// Sample data for testing
const sampleBooking: Booking = {
  id: '1',
  booking_code: 'BK-001',
  salon_id: 'salon-1',
  customer_phone: '+1234567890',
  customer_name: 'John Doe',
  service: 'Haircut & Styling',
  start_ts: new Date('2025-10-25T14:00:00'),
  status: BookingStatus.CONFIRMED,
  created_at: new Date(),
  updated_at: new Date(),
};

const chartData: ChartDataPoint[] = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 25 },
  { name: 'Fri', value: 22 },
  { name: 'Sat', value: 30 },
  { name: 'Sun', value: 18 },
];

export default function TestComponentsPage() {
  const [filters, setFilters] = useState<BookingFilterState>({
    status: 'all',
    startDate: null,
    endDate: null,
    searchQuery: '',
  });

  const handleFilterChange = (newFilters: BookingFilterState) => {
    console.log('Filters changed:', newFilters);
    setFilters(newFilters);
  };

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  const handleBookingEdit = (booking: Booking) => {
    console.log('Edit booking:', booking);
    alert(`Edit booking: ${booking.booking_code}`);
  };

  const handleBookingCancel = (booking: Booking) => {
    console.log('Cancel booking:', booking);
    alert(`Cancel booking: ${booking.booking_code}`);
  };

  const handleBookingComplete = (booking: Booking) => {
    console.log('Complete booking:', booking);
    alert(`Complete booking: ${booking.booking_code}`);
  };

  const handleLoginSubmit = () => {
    console.log('Login successful');
  };

  const handleBookingFormSubmit = async (data: CreateBookingInput) => {
    console.log('Booking form submitted:', data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Booking created successfully!');
  };

  return (
    <Container maxWidth="2xl" className="py-8">
      <div className="space-y-12">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Component Testing Page</h1>
          <p className="text-neutral-600">
            Testing all newly created feature and form components
          </p>
        </div>

        {/* BookingFilters */}
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">1. BookingFilters</h2>
          <Card className="p-6">
            <BookingFilters
              onFilterChange={handleFilterChange}
              onSearch={handleSearch}
              onReset={() => console.log('Reset filters')}
            />
          </Card>
          <div className="mt-4 p-4 bg-neutral-100 rounded-lg">
            <p className="text-sm font-medium text-neutral-700">Current Filters:</p>
            <pre className="text-xs text-neutral-600 mt-2">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>
        </section>

        {/* MessageBubble */}
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">2. MessageBubble</h2>
          <Card className="p-6 space-y-4">
            <MessageBubble
              variant="inbound"
              text="Hi! I'd like to book an appointment for tomorrow at 3 PM"
              timestamp={new Date()}
            />
            <MessageBubble
              variant="outbound"
              text="Hello! Sure, I can help you with that. What service would you like?"
              timestamp={new Date()}
              status={MessageStatus.DELIVERED}
            />
            <MessageBubble
              variant="inbound"
              text="I need a haircut and maybe some styling advice"
              timestamp={new Date()}
            />
            <MessageBubble
              variant="outbound"
              text="Perfect! I've booked you for tomorrow at 3 PM for a haircut and styling consultation. See you then!"
              timestamp={new Date()}
              status={MessageStatus.READ}
            />
          </Card>
        </section>

        {/* Chart */}
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">3. Chart Component</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Chart
              type="line"
              data={chartData}
              title="Bookings This Week (Line)"
              height={300}
            />
            <Chart
              type="bar"
              data={chartData}
              title="Bookings This Week (Bar)"
              height={300}
            />
          </div>
          <div className="mt-6">
            <Chart
              type="line"
              data={[]}
              title="Empty State Example"
              emptyMessage="No bookings data available"
              height={250}
            />
          </div>
        </section>

        {/* BookingCard */}
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">4. BookingCard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BookingCard
              booking={sampleBooking}
              onEdit={handleBookingEdit}
              onCancel={handleBookingCancel}
              onComplete={handleBookingComplete}
            />
            <BookingCard
              booking={{
                ...sampleBooking,
                id: '2',
                booking_code: 'BK-002',
                customer_name: 'Jane Smith',
                service: 'Hair Coloring',
                status: BookingStatus.CONFIRMED,
              }}
              onEdit={handleBookingEdit}
              onCancel={handleBookingCancel}
              onComplete={handleBookingComplete}
            />
            <BookingCard
              booking={{
                ...sampleBooking,
                id: '3',
                booking_code: 'BK-003',
                customer_name: 'Bob Johnson',
                service: 'Beard Trim',
                status: BookingStatus.COMPLETED,
              }}
              onEdit={handleBookingEdit}
            />
            <BookingCard
              booking={{
                ...sampleBooking,
                id: '4',
                booking_code: 'BK-004',
                customer_name: 'Alice Brown',
                service: 'Full Package',
                status: BookingStatus.CANCELLED,
              }}
              onEdit={handleBookingEdit}
            />
          </div>
        </section>

        {/* LoginForm */}
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">5. LoginForm</h2>
          <Card className="p-6 flex justify-center">
            <LoginForm onSuccess={handleLoginSubmit} redirectTo="/dashboard" />
          </Card>
        </section>

        {/* BookingForm */}
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">6. BookingForm</h2>
          <Card className="p-6 flex justify-center">
            <BookingForm
              onSubmit={handleBookingFormSubmit}
              onCancel={() => console.log('Form cancelled')}
              submitLabel="Create Test Booking"
            />
          </Card>
        </section>

        {/* Testing Checklist */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Testing Checklist</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>All components render without errors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>BookingFilters: Test status tabs, date pickers, and search</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>MessageBubble: Verify WhatsApp-style design and status icons</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>Chart: Check line/bar charts and empty state</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>BookingCard: Test actions menu (Edit, Cancel, Complete)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>LoginForm: Try form validation and submission</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>BookingForm: Test all fields and validation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>Check responsive behavior on mobile/tablet/desktop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">✓</span>
              <span>Verify no console errors in browser DevTools</span>
            </li>
          </ul>
        </section>
      </div>
    </Container>
  );
}
