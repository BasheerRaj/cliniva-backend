import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Admin Dashboard data' })
  @ApiResponse({ status: 200, description: 'Admin dashboard data' })
  async getAdminDashboard(@Query('period') period?: string) {
    return {
      success: true,
      data: await this.dashboardService.getAdminDashboard(period || 'month'),
    };
  }

  @Get('staff')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get Staff Dashboard data' })
  async getStaffDashboard(@Request() req: any, @Query('clinicId') clinicId?: string) {
    // If clinicId not provided, use user's clinicId
    const effectiveClinicId = clinicId || req.user.clinicId;
    return {
      success: true,
      data: await this.dashboardService.getStaffDashboard(effectiveClinicId),
    };
  }

  @Get('doctor')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Doctor Dashboard data' })
  async getDoctorDashboard(@Request() req: any, @Query('doctorId') doctorId?: string) {
    // If doctorId not provided, use authenticated user's ID
    const effectiveDoctorId = doctorId || req.user.id;
    return {
      success: true,
      data: await this.dashboardService.getDoctorDashboard(effectiveDoctorId),
    };
  }
}
