/**
 * User Story 1 Analytics Module
 *
 * Exports:
 * - US1AnalyticsService: Main analytics tracking service
 * - US1AnalyticsController: REST API endpoints for analytics
 * - Analytics interfaces and types
 */

export { US1AnalyticsService } from './us1-analytics.service';
export { US1AnalyticsController } from './us1-analytics.controller';
export type {
  US1AnalyticsEvent,
  SessionMetrics,
  SuccessCriteriaResults,
} from './us1-analytics.service';
