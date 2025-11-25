/**
 * Analytics Types
 * Type definitions for analytics data and API responses
 */

export interface StaffPerformanceMetrics {
  master_id: number;
  name: string;
  total_bookings: number;
  revenue: number;
  cancellation_rate: number;
  utilization_rate: number;
  popular_services: Array<{
    service_name: string;
    count: number;
  }>;
  peak_hours: Array<{
    hour: number;
    count: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  average_rating?: number;
}

export interface StaffPerformanceResponse {
  date_range: {
    start: string;
    end: string;
  };
  staff: StaffPerformanceMetrics[];
  summary: {
    total_bookings: number;
    total_revenue: number;
    average_utilization: number;
  };
}

export interface ServicePerformanceMetrics {
  service_id: number;
  name: string;
  category: string;
  total_bookings: number;
  revenue: number;
  avg_frequency: number;
  growth_rate: number;
  popular_times: Array<{
    day: string;
    hour: number;
    count: number;
  }>;
  conversion_rate?: number;
}

export interface ServicePerformanceResponse {
  date_range: {
    start: string;
    end: string;
  };
  services: ServicePerformanceMetrics[];
  by_category: Array<{
    category: string;
    total_bookings: number;
    revenue: number;
    avg_price: number;
    growth_rate: number;
  }>;
}

export interface RevenueAnalyticsResponse {
  date_range: {
    start: string;
    end: string;
  };
  total_revenue: number;
  period_comparison: number;
  by_category: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  by_staff: Array<{
    master_id: number;
    name: string;
    revenue: number;
    percentage: number;
  }>;
  by_day_of_week: Array<{
    day: string;
    revenue: number;
  }>;
  trend_data: Array<{
    date: string;
    revenue: number;
    bookings: number;
  }>;
  forecast?: Array<{
    date: string;
    predicted_revenue: number;
    confidence_low: number;
    confidence_high: number;
  }>;
  payment_status: {
    paid: number;
    pending: number;
    failed: number;
  };
  metrics: {
    average_transaction_value: number;
    revenue_per_customer: number;
    revenue_per_booking: number;
  };
}

export interface CustomerAnalyticsResponse {
  date_range: {
    start: string;
    end: string;
  };
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  churn_rate: number;
  customer_lifetime_value: number;
  average_bookings_per_customer: number;
  segmentation: {
    by_frequency: Array<{
      segment: string;
      count: number;
      percentage: number;
    }>;
    by_spending: Array<{
      tier: string;
      count: number;
      avg_spend: number;
    }>;
    by_service_preference: Array<{
      category: string;
      count: number;
    }>;
  };
  growth_data: Array<{
    date: string;
    total_customers: number;
    new_customers: number;
  }>;
  retention_cohorts?: Array<{
    cohort: string;
    month_0: number;
    month_1: number;
    month_2: number;
    month_3: number;
  }>;
}

export interface AIPerformanceResponse {
  date_range: {
    start: string;
    end: string;
  };
  total_conversations: number;
  messages_processed: number;
  successful_bookings: number;
  success_rate: number;
  average_response_time: number;
  token_usage: {
    total_tokens: number;
    total_cost: number;
    average_per_conversation: number;
  };
  intent_analysis: {
    intents: Array<{
      intent: string;
      count: number;
      conversion_rate: number;
    }>;
    failed_detections: number;
  };
  usage_over_time: Array<{
    date: string;
    conversations: number;
    messages: number;
    tokens: number;
  }>;
  language_distribution: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  performance_metrics: {
    avg_conversation_length: number;
    avg_resolution_time: number;
    escalation_rate: number;
  };
}

export interface DashboardOverview {
  bookings: {
    today: number;
    last_7_days: number;
    last_30_days: number;
    trend: number;
  };
  revenue: {
    total: number;
    period_comparison: number;
    average_booking_value: number;
  };
  customers: {
    active: number;
    new_this_month: number;
    returning_rate: number;
  };
  conversion: {
    message_to_booking: number;
    cancellation_rate: number;
  };
  recent_bookings: Array<{
    id: number;
    customer_name: string;
    service: string;
    status: string;
    time: string;
  }>;
  upcoming_today: Array<{
    id: number;
    customer_name: string;
    service: string;
    time: string;
    master_name: string;
  }>;
  status_distribution: Array<{
    status: string;
    count: number;
  }>;
}

export interface AnalyticsParams {
  salon_id: string;
  start_date: string;
  end_date: string;
  master_id?: number;
  service_id?: number;
  category?: string;
}
