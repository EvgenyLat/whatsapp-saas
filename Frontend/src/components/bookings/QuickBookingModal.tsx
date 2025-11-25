/**
 * QuickBookingModal Component
 * Simple modal for creating bookings with just customer name and phone
 *
 * Features:
 * - Minimal input: only name and phone required
 * - Auto-filled service, master, date, and time from clicked slot
 * - Fast booking creation from calendar view
 */

'use client';

import * as React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalDescription,
  Button,
  Input,
  LoadingSpinner,
} from '@/components/ui';
import { useServices } from '@/hooks/api/useServices';
import { User, Phone, Calendar, Clock, User as UserIcon } from 'lucide-react';
import type { Service, Master } from '@/types';

export interface QuickBookingModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Salon ID */
  salonId: string;
  /** Master for this booking */
  master: Master;
  /** Selected date */
  date: Date;
  /** Selected time (HH:mm format) */
  time: string;
  /** Callback when booking is submitted */
  onSubmit: (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    master_id: string;
    date: Date;
    time: string;
  }) => void;
  /** Whether form is submitting */
  isLoading?: boolean;
}

export function QuickBookingModal({
  isOpen,
  onClose,
  salonId,
  master,
  date,
  time,
  onSubmit,
  isLoading = false,
}: QuickBookingModalProps) {
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');

  // Fetch services to get default service
  const { data: servicesData, isLoading: loadingServices } = useServices({ is_active: true });

  // Select default service - prioritize services matching master's specialization
  const defaultService = React.useMemo(() => {
    if (!servicesData?.data || servicesData.data.length === 0) return null;

    // Try to find a service matching master's specialization
    const matchingService = servicesData.data.find((service) =>
      master.specialization?.some((spec) =>
        service.name.toLowerCase().includes(spec.toLowerCase()) ||
        service.category.toLowerCase().includes(spec.toLowerCase())
      )
    );

    // Fallback to first service
    return matchingService || servicesData.data[0];
  }, [servicesData, master.specialization]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setCustomerName('');
      setCustomerPhone('');
    }
  }, [isOpen]);

  // Format date for display
  const formattedDate = React.useMemo(() => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim() || !defaultService) {
      return;
    }

    onSubmit({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      service_id: defaultService.id,
      master_id: master.id,
      date,
      time,
    });
  };

  const isFormValid = customerName.trim() !== '' && customerPhone.trim() !== '' && !!defaultService;

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Quick Booking</ModalTitle>
            <ModalDescription>
              Enter customer details
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {/* Booking Details Summary - Compact */}
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-neutral-600" />
                  <span className="font-medium text-neutral-900">{master.name}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-600">
                  <span>{formattedDate}</span>
                  <span className="font-semibold">{time}</span>
                </div>
              </div>
              {loadingServices ? (
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-200">
                  <LoadingSpinner size="sm" />
                  <span>Loading service...</span>
                </div>
              ) : defaultService ? (
                <div className="text-xs text-neutral-600 mt-2 pt-2 border-t border-neutral-200">
                  {defaultService.name} • {defaultService.duration_minutes} min
                </div>
              ) : (
                <div className="text-xs text-error-600 mt-2 pt-2 border-t border-neutral-200">
                  No services available
                </div>
              )}
            </div>

            {/* Customer Name Input */}
            <div>
              <label htmlFor="customer_name" className="block text-sm font-medium text-neutral-700 mb-2">
                Customer Name *
              </label>
              <Input
                id="customer_name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            {/* Customer Phone Input */}
            <div>
              <label htmlFor="customer_phone" className="block text-sm font-medium text-neutral-700 mb-2">
                Phone Number *
              </label>
              <Input
                id="customer_phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1234567890"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <ModalFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isFormValid || isLoading || loadingServices}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Booking'
              )}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
