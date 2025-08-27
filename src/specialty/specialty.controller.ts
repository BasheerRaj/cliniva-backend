import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { SpecialtyService } from './specialty.service';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/create-specialty.dto';
import { Specialty } from '../database/schemas/specialty.schema';

@Controller('specialties')
export class SpecialtyController {
  constructor(private readonly specialtyService: SpecialtyService) {}

  /**
   * Create a new specialty
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSpecialty(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createSpecialtyDto: CreateSpecialtyDto,
  ): Promise<Specialty> {
    return this.specialtyService.createSpecialty(createSpecialtyDto);
  }

  /**
   * Get all specialties
   */
  @Get()
  async getAllSpecialties(
    @Query('search') searchTerm?: string,
  ): Promise<Specialty[]> {
    if (searchTerm) {
      return this.specialtyService.searchSpecialties(searchTerm);
    }
    return this.specialtyService.getAllSpecialties();
  }

  /**
   * Get specialty by ID
   */
  @Get(':id')
  async getSpecialty(@Param('id') id: string): Promise<Specialty> {
    return this.specialtyService.getSpecialty(id);
  }

  /**
   * Update specialty
   */
  @Put(':id')
  async updateSpecialty(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateSpecialtyDto: UpdateSpecialtyDto,
  ): Promise<Specialty> {
    return this.specialtyService.updateSpecialty(id, updateSpecialtyDto);
  }

  /**
   * Delete specialty
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSpecialty(@Param('id') id: string): Promise<void> {
    return this.specialtyService.deleteSpecialty(id);
  }

  /**
   * Search specialties
   */
  @Get('search/:term')
  async searchSpecialties(@Param('term') searchTerm: string): Promise<Specialty[]> {
    return this.specialtyService.searchSpecialties(searchTerm);
  }
}
