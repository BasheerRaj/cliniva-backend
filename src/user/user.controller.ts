import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  CheckUserEntitiesDto,
  UserEntitiesResponseDto,
} from './dto/check-user-entities.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async  getCurrentUser(@Request() req: any) {
    console.log('🔍 JWT User from request:', req.user);
    return { user: req.user, message: 'Authentication working!' };
  }

  @Post('check-entities')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async checkCurrentUserEntities(
    @Request() req: any,
  ): Promise<UserEntitiesResponseDto> {
    // Get userId from JWT token - the strategy returns user.id
    const userId = req.user.id;
    console.log(' JWT User from request:', req.user);
    console.log(' Using userId:', userId);
    return await this.userService.checkUserEntities(userId);
  }

  @Post('check-entities-by-id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async checkUserEntities(
    @Body() checkUserEntitiesDto: CheckUserEntitiesDto,
  ): Promise<UserEntitiesResponseDto> {
    return await this.userService.checkUserEntities(
      checkUserEntitiesDto.userId,
    );
  }

  @Get('entities-status')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserEntitiesStatus(
    @Request() req: any,
  ): Promise<UserEntitiesResponseDto> {
    const userId = req.user.id;
    console.log('🔍 Getting entities status for user:', userId);
    return await this.userService.checkUserEntities(userId);
  }

  @Get(':id/entities-status')
  @UseGuards(JwtAuthGuard)
  async getUserEntitiesStatus(
    @Param('id') userId: string,
  ): Promise<UserEntitiesResponseDto> {
    return await this.userService.checkUserEntities(userId);
  }
}
