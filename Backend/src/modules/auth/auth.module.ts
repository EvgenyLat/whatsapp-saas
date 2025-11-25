import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CsrfController } from './csrf.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.accessTokenExpiry'),
          algorithm: 'HS256', // SECURITY: Explicitly specify HS256 algorithm
        },
        verifyOptions: {
          algorithms: ['HS256'], // SECURITY: Only accept HS256 algorithm
        },
      }),
    }),
  ],
  controllers: [AuthController, CsrfController],
  providers: [AuthService, JwtStrategy, CsrfGuard],
  exports: [AuthService, JwtStrategy, PassportModule, CsrfGuard],
})
export class AuthModule {}
