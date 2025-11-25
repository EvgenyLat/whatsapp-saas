import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator';

@ApiTags('CSRF')
@Controller('csrf')
export class CsrfController {
  constructor(private readonly csrfGuard: CsrfGuard) {}

  @Get('token')
  @UseGuards(JwtAuthGuard)
  @SkipCsrf() // Don't require CSRF token to get a CSRF token
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get CSRF token',
    description: 'Get a CSRF token for the current authenticated session',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated successfully',
    schema: {
      example: {
        csrfToken: 'MTcwMDAwMDAwMDAwMDphYmMxMjM0NTY3ODkwZGVm...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getCsrfToken(@CurrentUser() user: any) {
    const csrfToken = this.csrfGuard.generateCsrfToken(user.id);
    return { csrfToken };
  }

  @Get('token/anonymous')
  @SkipCsrf() // Public endpoint - no CSRF required
  @ApiOperation({
    summary: 'Get anonymous CSRF token',
    description: 'Get a CSRF token for unauthenticated requests (e.g., login, register)',
  })
  @ApiResponse({
    status: 200,
    description: 'Anonymous CSRF token generated',
    schema: {
      example: {
        csrfToken: 'MTcwMDAwMDAwMDAwMDphYmMxMjM0NTY3ODkwZGVm...',
      },
    },
  })
  getAnonymousCsrfToken() {
    // For anonymous users, use a fixed identifier or IP-based
    // In production, consider using session IDs or client fingerprinting
    const csrfToken = this.csrfGuard.generateCsrfToken('anonymous');
    return { csrfToken };
  }
}
