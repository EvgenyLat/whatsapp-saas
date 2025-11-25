/**
 * New Booking Page
 * Create a new booking with smart form including service/master selection
 *
 * Features:
 * - Customer selection/creation
 * - Smart service and master selection
 * - Automatic duration calculation
 * - Real-time availability checking
 * - Price preview
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/ui';
import { SmartBookingForm, type SmartBookingFormData } from '@/components/bookings/SmartBookingForm';
import { useCreateBooking } from '@/hooks/api/useBookings';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { useServices } from '@/hooks/api/useServices';
import type { CreateBookingRequest } from '@/types';
import { ArrowLeft, User, Check } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
}

export default function NewBookingPage() {
  const router = useRouter();
  const salonId = useSalonIdSafe();

  const [step, setStep] = React.useState<'customer' | 'booking'>('customer');
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = React.useState('');
  const [newCustomerPhone, setNewCustomerPhone] = React.useState('');
  const [newCustomerEmail, setNewCustomerEmail] = React.useState('');

  // Fetch services to get service names
  const { data: servicesData } = useServices({ is_active: true });

  const createBooking = useCreateBooking(salonId || '');

  const handleCreateNewCustomer = () => {
    if (!newCustomerName || !newCustomerPhone) {
      alert('Please fill in customer name and phone number');
      return;
    }

    const customer: Customer = {
      id: `temp-${Date.now()}`,
      name: newCustomerName,
      phone_number: newCustomerPhone,
      email: newCustomerEmail || undefined,
    };

    setSelectedCustomer(customer);
    setStep('booking');
  };

  const handleBookingSubmit = async (bookingData: SmartBookingFormData) => {
    if (!selectedCustomer || !salonId) return;

    try {
      // Find the selected service to get its name
      const selectedService = servicesData?.data?.find(
        (s) => s.id === bookingData.service_id
      );

      // Combine date and time into ISO timestamp
      const appointmentDateTime = `${bookingData.booking_date}T${bookingData.start_time}:00.000Z`;

      const data: CreateBookingRequest = {
        salon_id: salonId, // CRITICAL: Required by backend
        customer_phone: selectedCustomer.phone_number,
        customer_name: selectedCustomer.name,
        customer_email: selectedCustomer.email,
        service_id: bookingData.service_id,
        master_id: bookingData.master_id,
        start_ts: appointmentDateTime,
        service: selectedService?.name || 'Service', // Required by backend
      };

      const result = await createBooking.mutateAsync(data);
      // Navigate to bookings list on success
      if (result?.id) {
        router.push(`/dashboard/bookings/${result.id}`);
      } else {
        router.push('/dashboard/bookings');
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  const handleBack = () => {
    if (step === 'booking') {
      setStep('customer');
    } else {
      router.back();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          {step === 'customer' ? 'Cancel' : 'Back to Customer'}
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Create New Booking</h1>
          <p className="mt-1 text-neutral-600">
            {step === 'customer' ? 'Step 1: Select Customer' : 'Step 2: Booking Details'}
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between max-w-md">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  step === 'booking'
                    ? 'bg-success-500 border-success-500 text-white'
                    : 'bg-primary-500 border-primary-500 text-white'
                }`}
              >
                {step === 'booking' ? <Check className="h-5 w-5" /> : '1'}
              </div>
              <p className="text-xs text-neutral-600 mt-2">Customer</p>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${step === 'booking' ? 'bg-success-500' : 'bg-neutral-300'}`} />
            <div className="flex flex-col items-center flex-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  step === 'booking'
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'bg-white border-neutral-300 text-neutral-400'
                }`}
              >
                2
              </div>
              <p className="text-xs text-neutral-600 mt-2">Booking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {step === 'customer' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Customer Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Customer Name *
                </label>
                <Input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleCreateNewCustomer}
                className="w-full"
              >
                Continue to Booking Details
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'booking' && selectedCustomer && (
          <>
            {/* Selected Customer Info */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{selectedCustomer.name}</p>
                      <p className="text-sm text-neutral-600">{selectedCustomer.phone_number}</p>
                      {selectedCustomer.email && (
                        <p className="text-xs text-neutral-500">{selectedCustomer.email}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setStep('customer')}>
                    Change Customer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Smart Booking Form */}
            <SmartBookingForm
              salonId={salonId || ''}
              onSubmit={handleBookingSubmit}
              isLoading={createBooking.isPending}
              submitText="Create Booking"
              showCancel={true}
              onCancel={() => setStep('customer')}
            />

            {/* Error Display */}
            {createBooking.isError && (
              <Card className="mt-6 border-error-200 bg-error-50">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-error-800">Failed to create booking</p>
                  <p className="text-sm text-error-700 mt-1">
                    {(createBooking.error as any)?.message || 'Please try again'}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
