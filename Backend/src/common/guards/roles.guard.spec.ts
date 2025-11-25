import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (user: any = null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ id: 'user-123', role: 'SALON_OWNER' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when no roles are specified (null)', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext({ id: 'user-123', role: 'SALON_OWNER' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SALON_OWNER']);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should allow access when user has required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SALON_OWNER']);
      const user = { id: 'user-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN', 'SALON_OWNER']);
      const user = { id: 'user-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN']);
      const user = { id: 'user-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User does not have required roles: SUPER_ADMIN');
    });

    it('should throw ForbiddenException when user does not have any of required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN', 'ADMIN']);
      const user = { id: 'user-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User does not have required roles: SUPER_ADMIN, ADMIN');
    });

    it('should check roles from both handler and class decorators', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SALON_OWNER']);
      const user = { id: 'user-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('Role-based access scenarios', () => {
    it('should allow SUPER_ADMIN to access admin-only endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN']);
      const user = { id: 'admin-123', role: 'SUPER_ADMIN' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prevent SALON_OWNER from accessing admin-only endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN']);
      const user = { id: 'salon-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow SALON_OWNER to access salon management endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SALON_OWNER']);
      const user = { id: 'salon-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow both SUPER_ADMIN and SALON_OWNER to access shared endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN', 'SALON_OWNER']);

      const admin = { id: 'admin-123', role: 'SUPER_ADMIN' };
      const salonOwner = { id: 'salon-123', role: 'SALON_OWNER' };

      const adminContext = createMockExecutionContext(admin);
      const salonContext = createMockExecutionContext(salonOwner);

      expect(guard.canActivate(adminContext)).toBe(true);
      expect(guard.canActivate(salonContext)).toBe(true);
    });

    it('should handle custom roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['CUSTOM_ROLE']);
      const user = { id: 'user-123', role: 'CUSTOM_ROLE' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should be case-sensitive for role matching', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SALON_OWNER']);
      const user = { id: 'user-123', role: 'salon_owner' }; // lowercase
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Error handling', () => {
    it('should provide clear error message when role check fails', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN', 'ADMIN']);
      const user = { id: 'user-123', role: 'SALON_OWNER' };
      const context = createMockExecutionContext(user);

      try {
        guard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('SUPER_ADMIN');
        expect(error.message).toContain('ADMIN');
      }
    });

    it('should handle undefined user gracefully', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SALON_OWNER']);
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should handle user object without role property', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['SALON_OWNER']);
      const user = { id: 'user-123' }; // No role property
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
