import { Controller, Post, Get, Body, Param, Put } from '@nestjs/common';
import { ComplexService } from './complex.service';
import { CreateComplexDto, UpdateComplexDto } from './dto/create-complex.dto';

@Controller('complexes')
export class ComplexController {
  constructor(private readonly complexService: ComplexService) {}

  @Post()
  async createComplex(@Body() createComplexDto: CreateComplexDto) {
    try {
      const complex = await this.complexService.createComplex(createComplexDto);
      return { 
        success: true, 
        message: 'Complex created successfully',
        data: complex 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create complex',
        error: error.message
      };
    }
  }

  @Get(':id')
  async getComplex(@Param('id') id: string) {
    try {
      const complex = await this.complexService.getComplex(id);
      return { 
        success: true, 
        message: 'Complex retrieved successfully',
        data: complex 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex',
        error: error.message
      };
    }
  }

  @Put(':id')
  async updateComplex(@Param('id') id: string, @Body() updateComplexDto: UpdateComplexDto) {
    try {
      const complex = await this.complexService.updateComplex(id, updateComplexDto);
      return { 
        success: true, 
        message: 'Complex updated successfully',
        data: complex 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update complex',
        error: error.message
      };
    }
  }

  @Get('subscription/:subscriptionId')
  async getComplexBySubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      const complex = await this.complexService.getComplexBySubscription(subscriptionId);
      return { 
        success: true, 
        message: complex ? 'Complex found' : 'No complex found for this subscription',
        data: complex 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex by subscription',
        error: error.message
      };
    }
  }

  @Get('organization/:organizationId')
  async getComplexesByOrganization(@Param('organizationId') organizationId: string) {
    try {
      const complexes = await this.complexService.getComplexesByOrganization(organizationId);
      return { 
        success: true, 
        message: 'Complexes retrieved successfully',
        data: complexes 
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complexes by organization',
        error: error.message
      };
    }
  }
} 