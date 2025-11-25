/**
 * MSW Server Setup
 * WhatsApp SaaS Platform - API Integration Tests
 *
 * Mock Service Worker server for testing
 * Lifecycle hooks are in jest.setup.js
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Setup MSW server with default handlers
 */
export const server = setupServer(...handlers);

/**
 * Export MSW utilities for custom handler setup in tests
 */
export { http, HttpResponse } from 'msw';
