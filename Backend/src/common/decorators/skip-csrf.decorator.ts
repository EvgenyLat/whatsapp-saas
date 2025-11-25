import { SetMetadata } from '@nestjs/common';
import { SKIP_CSRF_KEY } from '../guards/csrf.guard';

/**
 * Decorator to skip CSRF validation for specific routes
 * Use only for public endpoints or where CSRF is not applicable (e.g., API-only endpoints)
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
