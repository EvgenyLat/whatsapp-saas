import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: jest.fn(),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access to public routes without authentication', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call parent canActivate for protected routes', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      // Mock the parent's canActivate
      const superCanActivate = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );
      superCanActivate.mockReturnValue(true);

      guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalledWith(context);
    });

    it('should check both handler and class for public decorator', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();
      const handler = context.getHandler();
      const classRef = context.getClass();

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, classRef]);
    });
  });

  describe('handleRequest', () => {
    const mockContext = createMockExecutionContext();

    it('should return user when authentication succeeds', () => {
      const user = { id: 'user-123', email: 'test@example.com', role: 'SALON_OWNER' };

      const result = guard.handleRequest(null, user, null, mockContext);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, undefined, null, mockContext)).toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw existing error when error is provided', () => {
      const error = new Error('JWT malformed');

      expect(() => guard.handleRequest(error, null, null, mockContext)).toThrow(error);
    });

    it('should throw error even when user exists if error is provided', () => {
      const error = new Error('Token blacklisted');
      const user = { id: 'user-123' };

      expect(() => guard.handleRequest(error, user, null, mockContext)).toThrow(error);
    });

    it('should handle expired JWT tokens', () => {
      const error = new Error('TokenExpiredError');

      expect(() =>
        guard.handleRequest(error, null, { name: 'TokenExpiredError' }, mockContext),
      ).toThrow(error);
    });

    it('should handle invalid JWT tokens', () => {
      expect(() =>
        guard.handleRequest(
          null,
          null,
          {
            name: 'JsonWebTokenError',
            message: 'invalid signature',
          },
          mockContext,
        ),
      ).toThrow(UnauthorizedException);
    });

    it('should return valid user object with all properties', () => {
      const user = {
        id: 'user-456',
        email: 'salon@example.com',
        role: 'SALON_OWNER',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = guard.handleRequest(null, user, null, mockContext);

      expect(result).toEqual(user);
      expect(result.id).toBe('user-456');
      expect(result.role).toBe('SALON_OWNER');
    });
  });

  describe('Integration scenarios', () => {
    it('should allow public login endpoint without token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow public registration endpoint without token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should protect dashboard endpoint requiring authentication', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      const superCanActivate = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );
      superCanActivate.mockReturnValue(true);

      guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalled();
    });
  });
});
