import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { HashUtil } from '../../common/utils/hash.util';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword123',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890',
    role: 'SALON_OWNER',
    is_email_verified: false,
    email_verified_at: null,
    is_active: true,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    salons: [],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    emailVerification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordReset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.accessTokenExpiry': '15m',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.refreshTokenExpiry': '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'StrongP@ssw0rd123',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+9876543210',
    };

    it('should successfully register a new user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      jest.spyOn(HashUtil, 'hash').mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        first_name: registerDto.firstName,
        last_name: registerDto.lastName,
        phone: registerDto.phone,
      });
      mockPrismaService.emailVerification.create.mockResolvedValue({
        id: 'verification-id',
        user_id: mockUser.id,
        token: 'verification-token',
        expires_at: new Date(),
        created_at: new Date(),
      });
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'refresh-token-id',
        token: 'refresh-token',
        user_id: mockUser.id,
        expires_at: new Date(),
        created_at: new Date(),
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email.toLowerCase());
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.emailVerification.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if phone already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(mockUser); // phone check

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'StrongP@ssw0rd123',
    };

    it('should successfully login a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(HashUtil, 'compare').mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'refresh-token-id',
        token: 'refresh-token',
        user_id: mockUser.id,
        expires_at: new Date(),
        created_at: new Date(),
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(HashUtil, 'compare').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, is_active: false });
      jest.spyOn(HashUtil, 'compare').mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenString = 'valid-refresh-token';

    it('should successfully refresh token', async () => {
      const mockRefreshToken = {
        id: 'refresh-token-id',
        token: refreshTokenString,
        user_id: mockUser.id,
        user: mockUser,
        expires_at: new Date(Date.now() + 86400000), // 1 day from now
        created_at: new Date(),
      };

      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, tokenId: 'token-id' });
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(mockRefreshToken);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'new-refresh-token-id',
        token: 'new-refresh-token',
        user_id: mockUser.id,
        expires_at: new Date(),
        created_at: new Date(),
      });

      const result = await service.refreshToken(refreshTokenString);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, tokenId: 'token-id' });
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenString)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      const expiredToken = {
        id: 'refresh-token-id',
        token: refreshTokenString,
        user_id: mockUser.id,
        user: mockUser,
        expires_at: new Date(Date.now() - 86400000), // 1 day ago
        created_at: new Date(),
      };

      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, tokenId: 'token-id' });
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(expiredToken);

      await expect(service.refreshToken(refreshTokenString)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    const verificationToken = 'valid-verification-token';

    it('should successfully verify email', async () => {
      const mockVerification = {
        id: 'verification-id',
        user_id: mockUser.id,
        token: verificationToken,
        expires_at: new Date(Date.now() + 86400000),
        created_at: new Date(),
        user: mockUser,
      };

      mockPrismaService.emailVerification.findUnique.mockResolvedValue(mockVerification);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, is_email_verified: true });
      mockPrismaService.emailVerification.delete.mockResolvedValue(mockVerification);

      const result = await service.verifyEmail(verificationToken);

      expect(result.message).toBe('Email verified successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.emailVerification.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException if verification token not found', async () => {
      mockPrismaService.emailVerification.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(verificationToken)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if verification token is expired', async () => {
      const expiredVerification = {
        id: 'verification-id',
        user_id: mockUser.id,
        token: verificationToken,
        expires_at: new Date(Date.now() - 86400000),
        created_at: new Date(),
        user: mockUser,
      };

      mockPrismaService.emailVerification.findUnique.mockResolvedValue(expiredVerification);
      mockPrismaService.emailVerification.delete.mockResolvedValue(expiredVerification);

      await expect(service.verifyEmail(verificationToken)).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = { email: 'test@example.com' };

    it('should create password reset token for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.passwordReset.create.mockResolvedValue({
        id: 'reset-id',
        user_id: mockUser.id,
        token: 'reset-token',
        expires_at: new Date(),
        used: false,
        created_at: new Date(),
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toBe('If the email exists, a password reset link has been sent');
      expect(mockPrismaService.passwordReset.create).toHaveBeenCalled();
    });

    it('should return success message even if user not found (security)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toBe('If the email exists, a password reset link has been sent');
      expect(mockPrismaService.passwordReset.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'NewStrongP@ssw0rd123',
    };

    it('should successfully reset password', async () => {
      const mockReset = {
        id: 'reset-id',
        user_id: mockUser.id,
        token: resetPasswordDto.token,
        expires_at: new Date(Date.now() + 86400000),
        used: false,
        created_at: new Date(),
        user: mockUser,
      };

      mockPrismaService.passwordReset.findUnique.mockResolvedValue(mockReset);
      jest.spyOn(HashUtil, 'hash').mockResolvedValue('newHashedPassword');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.passwordReset.update.mockResolvedValue({ ...mockReset, used: true });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword(resetPasswordDto);

      expect(result.message).toBe('Password reset successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if reset token not found', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if reset token already used', async () => {
      const usedReset = {
        id: 'reset-id',
        user_id: mockUser.id,
        token: resetPasswordDto.token,
        expires_at: new Date(Date.now() + 86400000),
        used: true,
        created_at: new Date(),
        user: mockUser,
      };

      mockPrismaService.passwordReset.findUnique.mockResolvedValue(usedReset);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const refreshTokenString = 'valid-refresh-token';
      const mockToken = {
        id: 'token-id',
        token: refreshTokenString,
        user_id: mockUser.id,
        expires_at: new Date(),
        created_at: new Date(),
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(mockToken);

      const result = await service.logout(refreshTokenString);

      expect(result.message).toBe('Logged out successfully');
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalled();
    });

    it('should return success even if token not found', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      const result = await service.logout('non-existent-token');

      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user information', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(mockUser.id);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result).toHaveProperty('firstName', mockUser.first_name);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
