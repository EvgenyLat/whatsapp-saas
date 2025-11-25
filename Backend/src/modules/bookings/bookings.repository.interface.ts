import { Booking } from '@prisma/client';
import { IBaseRepository } from '@common/repositories';

/**
 * Bookings Repository Interface
 * Defines booking-specific data access methods
 */
export interface IBookingsRepository extends IBaseRepository<Booking> {
  /**
   * Find booking by booking code and salon ID
   * @param bookingCode - Booking code
   * @param salonId - Salon ID
   * @returns Booking or null
   */
  findByBookingCodeAndSalonId(bookingCode: string, salonId: string): Promise<Booking | null>;

  /**
   * Find bookings by salon ID with filters
   * @param salonId - Salon ID
   * @param filters - Additional filters (status, customer_phone, date range)
   * @param options - Query options (pagination, ordering)
   * @returns Array of bookings
   */
  findBySalonId(
    salonId: string,
    filters?: BookingFilters,
    options?: BookingQueryOptions,
  ): Promise<Booking[]>;

  /**
   * Find bookings by multiple salon IDs
   * @param salonIds - Array of salon IDs
   * @param filters - Additional filters
   * @param options - Query options
   * @returns Array of bookings
   */
  findByMultipleSalonIds(
    salonIds: string[],
    filters?: BookingFilters,
    options?: BookingQueryOptions,
  ): Promise<Booking[]>;

  /**
   * Find bookings by customer phone
   * @param customerPhone - Customer phone number
   * @param salonId - Optional salon ID filter
   * @returns Array of bookings
   */
  findByCustomerPhone(customerPhone: string, salonId?: string): Promise<Booking[]>;

  /**
   * Find bookings by status
   * @param status - Booking status
   * @param salonId - Optional salon ID filter
   * @returns Array of bookings
   */
  findByStatus(status: string, salonId?: string): Promise<Booking[]>;

  /**
   * Find bookings by date range
   * @param salonId - Salon ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of bookings
   */
  findByDateRange(salonId: string, startDate: Date, endDate: Date): Promise<Booking[]>;

  /**
   * Update booking status
   * @param id - Booking ID
   * @param status - New status
   * @returns Updated booking
   */
  updateStatus(id: string, status: string): Promise<Booking>;

  /**
   * Find booking by phone number and booking code
   * Used for customer-initiated cancellations via WhatsApp
   * @param salonId - Salon ID
   * @param customerPhone - Customer phone number
   * @param bookingCode - Booking code
   * @returns Booking or null
   */
  findByPhoneAndCode(
    salonId: string,
    customerPhone: string,
    bookingCode: string,
  ): Promise<Booking | null>;

  /**
   * Count bookings with filters
   * @param salonId - Optional salon ID filter
   * @param filters - Additional filters
   * @returns Count of matching bookings
   */
  countWithFilters(salonId?: string, filters?: BookingFilters): Promise<number>;

  /**
   * Find paginated bookings with filters
   * @param salonId - Optional salon ID filter or array of salon IDs
   * @param filters - Additional filters
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated bookings
   */
  findPaginatedWithFilters(
    salonId: string | string[] | null,
    filters: BookingFilters,
    page: number,
    limit: number,
  ): Promise<{
    data: Booking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

/**
 * Booking filters
 */
export interface BookingFilters {
  status?: string;
  customer_phone?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  master_id?: string;
  service_id?: string;
}

/**
 * Booking query options
 */
export interface BookingQueryOptions {
  skip?: number;
  take?: number;
  orderBy?: any;
}
