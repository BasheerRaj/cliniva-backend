import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
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
  async getStaffDashboard(@Query('clinicId') clinicId?: string) {
    return {
      success: true,
      data: await this.dashboardService.getStaffDashboard(clinicId),
    };
  }

  @Get('doctor')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Get Doctor Dashboard data' })
  async getDoctorDashboard(@Query('doctorId') doctorId?: string) {
    return {
      success: true,
      data: await this.dashboardService.getDoctorDashboard(doctorId),
    };
  }
}
