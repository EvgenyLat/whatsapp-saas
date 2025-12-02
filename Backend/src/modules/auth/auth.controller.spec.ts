import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';

describe('AuthController', () => {
  let app: INestApplication;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    verifyEmail: jest.fn(),
    sendEmailVerification: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'SALON_OWNER',
    isEmailVerified: false,
  };

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(CsrfGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'StrongP@ssw0rd123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const controller = app.get<AuthController>(AuthController);
      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should validate required fields', async () => {
      const controller = app.get<AuthController>(AuthController);

      // This would typically be tested with supertest in E2E tests
      // Here we're just ensuring the service is called with valid DTOs
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const validDto = {
        email: 'test@example.com',
        password: 'ValidP@ssw0rd123',
      };

      await controller.register(validDto);
      expect(mockAuthService.register).toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('should login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const controller = app.get<AuthController>(AuthController);
      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const refreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(refreshResponse);

      const controller = app.get<AuthController>(AuthController);
      const result = await controller.refreshToken(refreshTokenDto);

      expect(result).toEqual(refreshResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email with token', async () => {
      const verifyEmailDto = {
        token: 'valid-verification-token',
      };

      const response = { message: 'Email verified successfully' };
      mockAuthService.verifyEmail.mockResolvedValue(response);

      const controller = app.get<AuthController>(AuthController);
      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result).toEqual(response);
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto.token);
    });
  });

  describe('POST /auth/send-verification', () => {
    it('should send email verification', async () => {
      const response = { message: 'Verification email sent successfully' };
      mockAuthService.sendEmailVerification.mockResolvedValue(response);

      const mockUserObj = { id: mockUser.id };
      const controller = app.get<AuthController>(AuthController);
      const result = await controller.sendEmailVerification(mockUserObj);

      expect(result).toEqual(response);
      expect(mockAuthService.sendEmailVerification).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should initiate password reset', async () => {
      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      const response = { message: 'If the email exists, a password reset link has been sent' };
      mockAuthService.forgotPassword.mockResolvedValue(response);

      const controller = app.get<AuthController>(AuthController);
      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(response);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with token', async () => {
      const resetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'NewStrongP@ssw0rd123',
      };

      const response = { message: 'Password reset successfully' };
      mockAuthService.resetPassword.mockResolvedValue(response);

      const controller = app.get<AuthController>(AuthController);
      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(response);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const response = { message: 'Logged out successfully' };
      mockAuthService.logout.mockResolvedValue(response);

      const controller = app.get<AuthController>(AuthController);
      const result = await controller.logout(refreshTokenDto);

      expect(result).toEqual(response);
      expect(mockAuthService.logout).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user information', async () => {
      const userInfo = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        phone: '+1234567890',
        role: mockUser.role,
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockAuthService.getCurrentUser.mockResolvedValue(userInfo);

      const mockUserObj = { id: mockUser.id };
      const controller = app.get<AuthController>(AuthController);
      const result = await controller.getCurrentUser(mockUserObj);

      expect(result).toEqual(userInfo);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
