import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, RefreshResponseDto } from './dto/auth-response.dto';
import * as argon2 from '@node-rs/argon2';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
    private readonly mailService: MailService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for unknown email: ${email}`);
      await this.auditService.record({
        organizationId: '00000000-0000-0000-0000-000000000000',
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { email, reason: 'User not found' },
        ipAddress,
        userAgent,
        requestId,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      this.logger.warn(`Login attempt for inactive user account: ${email}`);
      await this.auditService.record({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { email, reason: `Account status is ${user.status}` },
        ipAddress,
        userAgent,
        requestId,
      });
      throw new ForbiddenException(`User account is ${user.status.toLowerCase()}`);
    }

    // Verify Argon2id password hash
    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(user.passwordHash, password);
    } catch (err: any) {
      this.logger.error(`Error verifying password hash: ${err?.message || err}`);
    }

    if (!isPasswordValid) {
      this.logger.warn(`Failed password verification for user: ${email}`);
      await this.auditService.record({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { email, reason: 'Invalid credentials' },
        ipAddress,
        userAgent,
        requestId,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Fetch user permissions
    const permissions = await this.permissionsService.findByRole(user.roleId);

    // Issue 15m Access Token
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role.name,
      permissions,
    };
    const accessToken = this.jwtService.sign(jwtPayload);

    // Issue and persist 2d rotating Refresh Token
    const rawRefreshToken = this.generateSecureToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    const refreshDays = this.configService.get<number>('auth.refreshExpirationDays') || 2;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Record audit log
    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      details: { role: user.role.name },
      ipAddress,
      userAgent,
      requestId,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 2 * 24 * 60 * 60, // 2 days (172,800 seconds)
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
        },
      },
    };
  }

  async refresh(
    dto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string,
  ): Promise<RefreshResponseDto> {
    const { refreshToken: rawToken } = dto;
    const tokenHash = this.hashToken(rawToken);

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: if token is already revoked, potential theft detected!
    if (tokenRecord.isRevoked) {
      this.logger.error(
        `SECURITY ALERT: Refresh token reuse detected for user ${tokenRecord.userId}! Revoking all active sessions.`,
      );

      // Invalidate all active refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      await this.auditService.record({
        organizationId: tokenRecord.user.organizationId,
        userId: tokenRecord.userId,
        action: 'SECURITY_ALERT_REFRESH_TOKEN_REUSE',
        resource: 'auth',
        details: {
          compromisedTokenId: tokenRecord.id,
          actionTaken: 'All sessions revoked',
        },
        ipAddress,
        userAgent,
        requestId,
      });

      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions have been revoked for your security.',
      );
    }

    // Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true, revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (tokenRecord.user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is inactive');
    }

    // 1. Revoke the old token (one-time rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    // 2. Generate new refresh token
    const newRawRefreshToken = this.generateSecureToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const refreshDays = this.configService.get<number>('auth.refreshExpirationDays') || 2;
    const newExpiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    // 3. Issue new access token
    const permissions = await this.permissionsService.findByRole(
      tokenRecord.user.roleId,
    );

    const jwtPayload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      organizationId: tokenRecord.user.organizationId,
      role: tokenRecord.user.role.name,
      permissions,
    };
    const newAccessToken = this.jwtService.sign(jwtPayload);

    // 4. Log rotation audit
    await this.auditService.record({
      organizationId: tokenRecord.user.organizationId,
      userId: tokenRecord.userId,
      action: 'REFRESH_TOKEN_ROTATED',
      resource: 'auth',
      details: { previousTokenId: tokenRecord.id },
      ipAddress,
      userAgent,
      requestId,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: 2 * 24 * 60 * 60, // 2 days (172,800 seconds)
    };
  }

  async logout(
    userId: string,
    rawRefreshToken?: string,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    } else {
      // Revoke all tokens for user
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    }

    if (user) {
      await this.auditService.record({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'LOGOUT',
        resource: 'auth',
        details: { singleSession: Boolean(rawRefreshToken) },
        ipAddress,
        userAgent,
        requestId,
      });
    }

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = await this.permissionsService.findByRole(user.roleId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
    };
  }

  private readonly passwordResetCodes = new Map<string, { code: string; expiresAt: number }>();

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.passwordResetCodes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    // Send the verification code to the user's actual email address
    await this.mailService.sendPasswordResetOtp(normalizedEmail, code);

    // SECURE: Do NOT return the verification code in the HTTP response
    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}. Please check your email inbox.`,
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const record = this.passwordResetCodes.get(normalizedEmail);

    if (!record || record.code !== code.trim()) {
      throw new UnauthorizedException('Invalid verification code');
    }

    if (Date.now() > record.expiresAt) {
      this.passwordResetCodes.delete(normalizedEmail);
      throw new UnauthorizedException('Verification code has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    const newHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    this.passwordResetCodes.delete(normalizedEmail);

    await this.auditService.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PASSWORD_RESET',
      resource: 'auth',
      details: { email: normalizedEmail },
    });

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }
}

