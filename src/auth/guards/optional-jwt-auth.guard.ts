import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { Subscription } from '../../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../../database/schemas/subscription-plan.schema';
import { SessionService } from '../session.service';
import { TokenService } from '../token.service';

/**
 * OptionalJwtAuthGuard - Like JwtAuthGuard but doesn't require authentication.
 *
 * If a valid JWT token is present in the Authorization header, it will extract
 * the user and attach it to the request. If no token is present or the token
 * is invalid, the request proceeds without a user attached.
 *
 * This is useful for endpoints like /auth/register where:
 * - Public registration (owner, patient) doesn't require auth
 * - Creating admin/doctor/staff requires authentication from an authorized user
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name)
    private readonly subscriptionPlanModel: Model<SubscriptionPlan>,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // If no auth header, allow the request to proceed without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.debug(
        'No auth token provided, proceeding without authentication',
      );
      request.user = null;
      return true;
    }

    try {
      const token = this.tokenService.extractTokenFromHeader(authHeader);

      if (!token) {
        request.user = null;
        return true;
      }

      // Check if token is blacklisted
      const tokenHash = this.tokenService.hashToken(token);
      const isBlacklisted =
        await this.sessionService.isTokenBlacklisted(tokenHash);

      if (isBlacklisted) {
        this.logger.debug(
          'Token is blacklisted, proceeding without authentication',
        );
        request.user = null;
        return true;
      }

      // Proceed with normal JWT validation
      const result = await super.canActivate(context);

      if (!result) {
        request.user = null;
        return true;
      }

      this.logger.debug(
        `Optional JWT: User authenticated as ${request.user?.id} with role ${request.user?.role}`,
      );

      return true;
    } catch (error) {
      // If JWT validation fails, allow the request to proceed without user
      this.logger.debug(
        `Optional JWT auth failed: ${error.message}, proceeding without authentication`,
      );
      request.user = null;
      return true;
    }
  }

  // Override handleRequest to not throw on missing user
  handleRequest(err: any, user: any) {
    // Don't throw errors, just return the user or null
    if (err || !user) {
      return null;
    }
    return user;
  }
}
