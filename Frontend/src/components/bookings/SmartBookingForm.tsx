/**
 * SmartBookingForm Component
 * Intelligent booking form with automatic duration calculation and availability checking
 *
 * Features:
 * - Service selection triggers duration auto-fill
 * - Master selection shows availability calendar
 * - Date/time picker highlights available slots
 * - Real-time conflict detection
 * - Price preview
 * - Estimated end time display
 */

'use client';

import * as React from 'react';
import { useServices } from '@/hooks/api/useServices';
import { useMasters } from '@/hooks/api/useMasters';
import { Card, CardContent, CardHeader, Button, Input, LoadingSpinner } from '@/components/ui';
import { AvailabilityChecker } from './AvailabilityChecker';
import { Clock, DollarSign, User, Calendar, AlertCircle } from 'lucide-react';
import type { Service, Master } from '@/types';

export interface SmartBookingFormData {
  service_id: string;
  master_id: string;
  booking_date: string;
  start_time: string;
  end_time?: string;
}

export interface SmartBookingFormProps {
  /** Salon ID */
  salonId: string;
  /** Initial values (for edit mode) */
  initialValues?: Partial<SmartBookingFormData>;
  /** Callback when form is submitted */
  onSubmit: (data: SmartBookingFormData) => void;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Form submit button text */
  submitText?: string;
  /** Whether to show cancel button */
  showCancel?: boolean;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
}

export function SmartBookingForm({
  salonId,
  initialValues,
  onSubmit,
  isLoading = false,
  submitText = 'Continue',
  showCancel = false,
  onCancel,
}: SmartBookingFormProps) {
  // Form state
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(
    initialValues?.service_id || null
  );
  const [selectedMasterId, setSelectedMasterId] = React.useState<string | null>(
    initialValues?.master_id || null
  );
  const [bookingDate, setBookingDate] = React.useState(initialValues?.booking_date || '');
  const [startTime, setStartTime] = React.useState(initialValues?.start_time || '');
  const [isAvailable, setIsAvailable] = React.useState(true);

  // Fetch data
  const { data: servicesData, isLoading: loadingServices } = useServices({ is_active: true });
  const { data: mastersData, isLoading: loadingMasters } = useMasters(salonId, { is_active: true });

  // Find selected service and master
  const selectedService = React.useMemo(
    () => servicesData?.data?.find((s) => s.id === selectedServiceId),
    [servicesData, selectedServiceId]
  );

  const selectedMaster = React.useMemo(
    () => mastersData?.data?.find((m) => m.id === selectedMasterId),
    [mastersData, selectedMasterId]
  );

  // Calculate end time based on service duration
  const endTime = React.useMemo(() => {
    if (!startTime || !selectedService) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = (hours || 0) * 60 + (minutes || 0) + selectedService.duration_minutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }, [startTime, selectedService]);

  // Form validation
  const isFormValid = React.useMemo(() => {
    return (
      selectedServiceId !== null &&
      selectedMasterId !== null &&
      bookingDate !== '' &&
      startTime !== '' &&
      isAvailable
    );
  }, [selectedServiceId, selectedMasterId, bookingDate, startTime, isAvailable]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !selectedServiceId || !selectedMasterId) return;

    onSubmit({
      service_id: selectedServiceId,
      master_id: selectedMasterId,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
    });
  };

  // Remember last selections in localStorage
  React.useEffect(() => {
    if (selectedServiceId) {
      localStorage.setItem('lastSelectedService', selectedServiceId);
    }
    if (selectedMasterId) {
      localStorage.setItem('lastSelectedMaster', selectedMasterId);
    }
  }, [selectedServiceId, selectedMasterId]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-neutral-900">Select Service</h2>
        </CardHeader>
        <CardContent>
          {loadingServices ? (
            <div className="py-8 text-center">
              <LoadingSpinner />
            </div>
          ) : servicesData?.data && servicesData.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {servicesData.data.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedServiceId === service.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900">{service.name}</p>
                      <p className="text-sm text-neutral-600 mt-1">{service.category}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-sm text-neutral-600">
                          <Clock className="h-3 w-3" />
                          {service.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1 text-sm font-medium text-neutral-900">
                          <DollarSign className="h-3 w-3" />
                          {(service.price / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-neutral-500">No active services available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Master/Staff Selection */}
      {selectedServiceId && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-neutral-900">Select Staff Member</h2>
          </CardHeader>
          <CardContent>
            {loadingMasters ? (
              <div className="py-8 text-center">
                <LoadingSpinner />
              </div>
            ) : mastersData?.data && mastersData.data.length > 0 ? (
              <div className="space-y-3">
                {mastersData.data.map((master) => (
                  <button
                    key={master.id}
                    type="button"
                    onClick={() => setSelectedMasterId(master.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedMasterId === master.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-900">{master.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {master.specialization?.map((spec, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                        {master.phone && (
                          <p className="text-sm text-neutral-600 mt-1">{master.phone}</p>
                        )}
                      </div>
                      {master.is_active && (
                        <div className="flex items-center gap-1 text-xs text-success-600">
                          <div className="h-2 w-2 rounded-full bg-success-500"></div>
                          Active
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-neutral-500">No active staff members available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Date & Time Selection */}
      {selectedServiceId && selectedMasterId && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-neutral-900">Select Date & Time</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date
                </label>
                <Input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Start Time
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Service Duration & End Time Info */}
            {selectedService && startTime && (
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Duration</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {selectedService.duration_minutes} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Estimated End Time</p>
                    <p className="text-lg font-semibold text-neutral-900">{endTime}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Checker */}
            {bookingDate && startTime && selectedMaster && (
              <AvailabilityChecker
                salonId={salonId}
                masterId={selectedMaster.id}
                date={bookingDate}
                startTime={startTime}
                duration={selectedService?.duration_minutes}
                onAvailabilityChange={setIsAvailable}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Price Preview */}
      {selectedService && (
        <Card className="border-primary-200 bg-primary-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-900">Total Price</p>
                <p className="text-xs text-primary-700 mt-1">
                  {selectedService.name} • {selectedService.duration_minutes} min
                </p>
              </div>
              <p className="text-2xl font-bold text-primary-900">
                ${(selectedService.price / 100).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning if slot not available */}
      {!isAvailable && bookingDate && startTime && (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error-900">Time Slot Not Available</p>
              <p className="text-sm text-error-700 mt-1">
                Please select a different time or check the suggested alternatives above
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid || isLoading}
          className="flex-1"
        >
          {isLoading ? 'Processing...' : submitText}
        </Button>
        {showCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
