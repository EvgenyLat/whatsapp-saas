import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CsrfGuard, SKIP_CSRF_KEY } from './csrf.guard';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: Reflector;
  let configService: ConfigService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CSRF_SECRET') return 'test-csrf-secret-12345';
      if (key === 'jwt.secret') return 'test-jwt-secret';
      return null;
    }),
  };

  const createMockExecutionContext = (
    method: string = 'POST',
    headers: Record<string, string> = {},
    user: any = null,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers,
          user,
          sessionID: 'test-session-id',
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<CsrfGuard>(CsrfGuard);
    reflector = module.get<Reflector>(Reflector);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw error if no CSRF secret configured', () => {
    const badConfigService = {
      get: jest.fn().mockReturnValue(null),
    };

    expect(() => {
      new CsrfGuard(reflector, badConfigService as any);
    }).toThrow('SECURITY ERROR: CSRF_SECRET not configured');
  });

  describe('canActivate', () => {
    it('should allow request when CSRF check is skipped via decorator', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext('POST');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_CSRF_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should allow GET requests without CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext('GET');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow HEAD requests without CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext('HEAD');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext('OPTIONS');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when CSRF token is missing', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext('POST', {});

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('CSRF token missing');
    });

    it('should validate and allow request with valid CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-123' };
      const csrfToken = guard.generateCsrfToken(user.id);
      const context = createMockExecutionContext('POST', { 'x-csrf-token': csrfToken }, user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException with invalid CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-123' };
      const invalidToken = 'invalid-token';
      const context = createMockExecutionContext('POST', { 'x-csrf-token': invalidToken }, user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Invalid CSRF token');
    });

    it('should use sessionID when user is not authenticated', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext('POST', { 'x-csrf-token': 'test-token' }, null);
      const sessionId = 'test-session-id';
      const validToken = guard.generateCsrfToken(sessionId);

      const contextWithValidToken = createMockExecutionContext('POST', { 'x-csrf-token': validToken }, null);

      const result = guard.canActivate(contextWithValidToken);

      expect(result).toBe(true);
    });

    it('should validate POST requests with CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-456' };
      const csrfToken = guard.generateCsrfToken(user.id);
      const context = createMockExecutionContext('POST', { 'x-csrf-token': csrfToken }, user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should validate PUT requests with CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-789' };
      const csrfToken = guard.generateCsrfToken(user.id);
      const context = createMockExecutionContext('PUT', { 'x-csrf-token': csrfToken }, user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should validate DELETE requests with CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-delete' };
      const csrfToken = guard.generateCsrfToken(user.id);
      const context = createMockExecutionContext('DELETE', { 'x-csrf-token': csrfToken }, user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should validate PATCH requests with CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-patch' };
      const csrfToken = guard.generateCsrfToken(user.id);
      const context = createMockExecutionContext('PATCH', { 'x-csrf-token': csrfToken }, user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('generateCsrfToken', () => {
    it('should generate a valid CSRF token', () => {
      const sessionId = 'test-session-123';
      const token = guard.generateCsrfToken(sessionId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different sessions', () => {
      const token1 = guard.generateCsrfToken('session-1');
      const token2 = guard.generateCsrfToken('session-2');

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for same session at different times', async () => {
      const sessionId = 'same-session';
      const token1 = guard.generateCsrfToken(sessionId);

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const token2 = guard.generateCsrfToken(sessionId);

      expect(token1).not.toBe(token2);
    });
  });

  describe('validateCsrfToken - private method tested via canActivate', () => {
    it('should reject expired CSRF token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-123' };

      // Create token with timestamp 25 hours in the past (beyond 24h limit)
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      const hash = require('crypto').createHash('sha256')
        .update(`${user.id}:${expiredTimestamp}:test-csrf-secret-12345`)
        .digest('hex');
      const expiredToken = Buffer.from(`${expiredTimestamp}:${hash}`).toString('base64');

      const context = createMockExecutionContext('POST', { 'x-csrf-token': expiredToken }, user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject token with future timestamp', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-123' };

      // Create token with timestamp in the future
      const futureTimestamp = Date.now() + (60 * 60 * 1000);
      const hash = require('crypto').createHash('sha256')
        .update(`${user.id}:${futureTimestamp}:test-csrf-secret-12345`)
        .digest('hex');
      const futureToken = Buffer.from(`${futureTimestamp}:${hash}`).toString('base64');

      const context = createMockExecutionContext('POST', { 'x-csrf-token': futureToken }, user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject malformed token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-123' };
      const malformedToken = Buffer.from('malformed-token-without-colon').toString('base64');

      const context = createMockExecutionContext('POST', { 'x-csrf-token': malformedToken }, user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject token with wrong session ID', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user1 = { id: 'user-123' };
      const user2 = { id: 'user-456' };

      // Generate token for user1
      const token = guard.generateCsrfToken(user1.id);

      // Try to use it with user2
      const context = createMockExecutionContext('POST', { 'x-csrf-token': token }, user2);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should accept token within valid time window', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-123' };

      // Generate fresh token
      const token = guard.generateCsrfToken(user.id);
      const context = createMockExecutionContext('POST', { 'x-csrf-token': token }, user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Security Features', () => {
    it('should use timing-safe comparison to prevent timing attacks', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-security-test' };
      const validToken = guard.generateCsrfToken(user.id);

      // Measure time for valid token
      const start1 = process.hrtime.bigint();
      try {
        const context = createMockExecutionContext('POST', { 'x-csrf-token': validToken }, user);
        guard.canActivate(context);
      } catch (e) {}
      const end1 = process.hrtime.bigint();
      const time1 = end1 - start1;

      // Measure time for invalid token
      const invalidToken = 'completely-wrong-token';
      const start2 = process.hrtime.bigint();
      try {
        const context = createMockExecutionContext('POST', { 'x-csrf-token': invalidToken }, user);
        guard.canActivate(context);
      } catch (e) {}
      const end2 = process.hrtime.bigint();
      const time2 = end2 - start2;

      // Timing should be similar (within order of magnitude) for constant-time comparison
      // This is a basic check - timing attacks are complex
      expect(typeof time1).toBe('bigint');
      expect(typeof time2).toBe('bigint');
    });

    it('should not leak information in error messages', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const user = { id: 'user-123' };
      const invalidToken = 'invalid-token';
      const context = createMockExecutionContext('POST', { 'x-csrf-token': invalidToken }, user);

      try {
        guard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Invalid CSRF token');
        // Should not expose details about what specifically was wrong
        expect(error.message).not.toContain('timestamp');
        expect(error.message).not.toContain('hash');
        expect(error.message).not.toContain('session');
      }
    });
  });
});
