import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { HashUtil } from '../../common/utils/hash.util';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { AuthResponse, JwtPayload } from './interfaces/auth-response.interface';
import { randomBytes } from 'crypto';
import { addDays, addHours } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user
   * Simplified registration: only email and password required
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password } = registerDto;

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await HashUtil.hash(password);

    // Create user with email and password
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'SALON_OWNER',
        is_email_verified: false,
        is_active: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Note: salon_id will be null for new registrations
    // User needs to create a salon through the dashboard
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        role: user.role,
        isEmailVerified: user.is_email_verified,
        salon_id: null, // New users don't have a salon yet
      },
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email and include first salon
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        salons: {
          take: 1,
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await HashUtil.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    // Update last login time
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Get first salon ID if user has salons
    const firstSalonId = user.salons.length > 0 ? user.salons[0].id : null;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        role: user.role,
        isEmailVerified: user.is_email_verified,
        salon_id: firstSalonId,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * SECURITY: Implements token rotation and reuse detection
   */
  async refreshToken(
    refreshTokenString: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenString },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // SECURITY: Reuse detection - if token already used, revoke all user tokens
    if (storedToken.is_used) {
      // Token reuse detected - possible token theft
      // Revoke all refresh tokens for this user as a security measure
      await this.prisma.refreshToken.deleteMany({
        where: { user_id: storedToken.user_id },
      });

      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions have been terminated for security. Please login again.',
      );
    }

    // Check if token is expired
    if (storedToken.expires_at < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check if user is active
    if (!storedToken.user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // SECURITY: Mark token as used instead of deleting immediately
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        is_used: true,
        used_at: new Date(),
      },
    });

    // Generate new tokens (rotation)
    const { accessToken, refreshToken } = await this.generateTokens(storedToken.user);

    // Clean up old used tokens (keep last 5 for audit trail)
    const oldUsedTokens = await this.prisma.refreshToken.findMany({
      where: {
        user_id: storedToken.user_id,
        is_used: true,
      },
      orderBy: { used_at: 'desc' },
      skip: 5,
    });

    if (oldUsedTokens.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          id: { in: oldUsedTokens.map((t) => t.id) },
        },
      });
    }

    return { accessToken, refreshToken };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (verification.expires_at < new Date()) {
      await this.prisma.emailVerification.delete({ where: { id: verification.id } });
      throw new BadRequestException('Verification token has expired');
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: verification.user_id },
      data: {
        is_email_verified: true,
        email_verified_at: new Date(),
      },
    });

    // Delete verification token
    await this.prisma.emailVerification.delete({ where: { id: verification.id } });

    return { message: 'Email verified successfully' };
  }

  /**
   * Send email verification (mock implementation)
   */
  async sendEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Delete existing verification tokens
    await this.prisma.emailVerification.deleteMany({ where: { user_id: userId } });

    // Create new verification token
    await this.createEmailVerificationToken(userId);

    // TODO: In production, send email with verification link
    // For now, we'll just return a success message
    // SECURITY: Token removed from logs - implement email service to send verification link

    return { message: 'Verification email sent successfully' };
  }

  /**
   * Initiate password reset
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists or not for security
    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Delete existing password reset tokens for this user
    await this.prisma.passwordReset.deleteMany({
      where: { user_id: user.id },
    });

    // Create password reset token
    const resetToken = randomBytes(32).toString('hex');
    await this.prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token: resetToken,
        expires_at: addHours(new Date(), 1), // Token expires in 1 hour
        used: false,
      },
    });

    // TODO: In production, send email with reset link
    // SECURITY: Token removed from logs - implement email service to send reset link

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetRecord.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (resetRecord.expires_at < new Date()) {
      await this.prisma.passwordReset.delete({ where: { id: resetRecord.id } });
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await HashUtil.hash(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: resetRecord.user_id },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { user_id: resetRecord.user_id },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshTokenString: string): Promise<{ message: string }> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenString },
    });

    if (token) {
      await this.prisma.refreshToken.delete({ where: { id: token.id } });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        is_email_verified: true,
        is_active: true,
        created_at: true,
        last_login_at: true,
        salons: {
          select: {
            id: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get the first salon ID (most recent salon)
    const salonId = user.salons && user.salons.length > 0 ? user.salons[0].id : null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.is_email_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      salon_id: salonId,
    };
  }

  /**
   * Generate JWT access token and refresh token
   */
  private async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.accessTokenExpiry'),
      algorithm: 'HS256', // SECURITY: Explicitly specify HS256 algorithm
    });

    // Create refresh token
    const refreshTokenString = randomBytes(32).toString('hex');
    const refreshTokenExpiry = addDays(new Date(), 7);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        user_id: user.id,
        expires_at: refreshTokenExpiry,
      },
    });

    return { accessToken, refreshToken: refreshTokenString };
  }

  /**
   * Create email verification token
   */
  private async createEmailVerificationToken(userId: string) {
    const token = randomBytes(32).toString('hex');
    const verification = await this.prisma.emailVerification.create({
      data: {
        user_id: userId,
        token,
        expires_at: addDays(new Date(), 7), // Token expires in 7 days
      },
    });

    return verification;
  }
}
