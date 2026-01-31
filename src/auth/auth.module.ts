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
import { User, UserSchema } from '../database/schemas/user.schema';
import { Subscription, SubscriptionSchema } from '../database/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../database/schemas/subscription-plan.schema';
import { TokenBlacklist, TokenBlacklistSchema } from '../database/schemas/token-blacklist.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    // Import required schemas for JwtAuthGuard
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
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
  providers: [AuthService, JwtStrategy, JwtAuthGuard, TokenService, SessionService],
  exports: [AuthService, JwtStrategy, PassportModule, JwtAuthGuard, TokenService, SessionService],
})
export class AuthModule {}




