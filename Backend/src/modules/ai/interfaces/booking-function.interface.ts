/**
 * Booking Function Interfaces
 * Defines the structure for AI function calling
 */

export interface CheckAvailabilityArgs {
  master_name: string;
  date_time: string; // ISO 8601 format
}

export interface CheckAvailabilityResult {
  available: boolean;
  requestedTime: string;
  masterName: string;
  alternatives?: string[]; // ISO 8601 format timestamps
  message: string;
}

export interface CreateBookingArgs {
  customer_name: string;
  customer_phone: string;
  master_name?: string;
  service: string;
  date_time: string; // ISO 8601 format
}

export interface CreateBookingResult {
  success: boolean;
  bookingCode?: string;
  message: string;
  booking?: {
    id: string;
    bookingCode: string;
    service: string;
    dateTime: string;
    masterName?: string;
  };
}

/**
 * Salon Service Configuration
 */
export interface SalonService {
  name: string;
  price: number;
  duration: number; // in hours
  category: string;
}

/**
 * Master Configuration
 */
export interface Master {
  name: string;
  services: string[];
  workingHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}
