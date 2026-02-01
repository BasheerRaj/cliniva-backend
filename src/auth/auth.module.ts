import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { AuditService } from './audit.service';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Subscription, SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { TokenBlacklist, TokenBlacklistSchema } from '../database/schemas/token-blacklist.schema';
import { AuditLog, AuditLogSchema } from '../database/schemas/audit-log.schema';
import { RateLimitCounter, RateLimitCounterSchema } from '../database/schemas/rate-limit-counter.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FirstLoginGuard } from './guards/first-login.guard';
import { RateLimitService } from './rate-limit.service';

@Module({
  imports: [
    // Import required schemas for JwtAuthGuard
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: RateLimitCounter.name, schema: RateLimitCounterSchema },
    ]),
    
    // Import SubscriptionModule for SubscriptionService
    SubscriptionModule,
    
    // Passport module
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // JWT module with async configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, FirstLoginGuard, TokenService, SessionService, AuditService, RateLimitService],
  exports: [AuthService, JwtStrategy, PassportModule, JwtAuthGuard, FirstLoginGuard, TokenService, SessionService, AuditService, RateLimitService],
})
export class AuthModule {}




