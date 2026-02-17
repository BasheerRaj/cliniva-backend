import { Controller, Post, Body, Get, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { PatientPortalService } from '../services/patient-portal.service';
import { RegisterPatientUserDto, LoginPatientDto } from '../dto/auth.dto';
import { BookAppointmentDto } from '../dto/appointment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('patient-portal')
export class PatientAuthController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterPatientUserDto) {
    return this.patientPortalService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginPatientDto) {
    return this.patientPortalService.login(loginDto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getDashboard(@Request() req: any) {
    return this.patientPortalService.getDashboard(req.user.userId);
  }

  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async bookAppointment(@Request() req: any, @Body() bookDto: BookAppointmentDto) {
    return this.patientPortalService.bookAppointment(req.user.userId, bookDto);
  }

  @Get('appointments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAppointments(@Request() req: any) {
    return this.patientPortalService.getAppointments(req.user.userId);
  }
}
