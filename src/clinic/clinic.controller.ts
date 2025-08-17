import { Controller, Post, Get, Body, Param, Put, Delete } from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { CreateClinicDto, UpdateClinicDto } from './dto/create-clinic.dto';

@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  async createClinic(@Body() createClinicDto: CreateClinicDto) {
    try {
      const clinic = await this.clinicService.createClinic(createClinicDto);
      return { 
        success: true, 
        message: 'Clinic created successfully',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create clinic',
        error: error.message
      };
    }
  }

  @Get(':id')
  async getClinic(@Param('id') id: string) {
    try {
      const clinic = await this.clinicService.getClinic(id);
      return { 
        success: true, 
        message: 'Clinic retrieved successfully',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic',
        error: error.message
      };
    }
  }

  @Put(':id')
  async updateClinic(@Param('id') id: string, @Body() updateClinicDto: UpdateClinicDto) {
    try {
      const clinic = await this.clinicService.updateClinic(id, updateClinicDto);
      return { 
        success: true, 
        message: 'Clinic updated successfully',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update clinic',
        error: error.message
      };
    }
  }

  @Get('subscription/:subscriptionId')
  async getClinicBySubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      const clinic = await this.clinicService.getClinicBySubscription(subscriptionId);
      return { 
        success: true, 
        message: clinic ? 'Clinic found' : 'No clinic found for this subscription',
        data: clinic 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinic by subscription',
        error: error.message
      };
    }
  }

  @Get('complex/:complexId')
  async getClinicsByComplex(@Param('complexId') complexId: string) {
    try {
      const clinics = await this.clinicService.getClinicsByComplex(complexId);
      return { 
        success: true, 
        message: 'Clinics retrieved successfully',
        data: clinics 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve clinics by complex',
        error: error.message
      };
    }
  }
} 