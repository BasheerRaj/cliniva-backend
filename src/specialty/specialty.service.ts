import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Specialty } from '../database/schemas/specialty.schema';

export interface CreateSpecialtyDto {
  name: string;
  description?: string;
}

export interface UpdateSpecialtyDto {
  name?: string;
  description?: string;
}

@Injectable()
export class SpecialtyService {
  constructor(
    @InjectModel('Specialty') private readonly specialtyModel: Model<Specialty>,
  ) {}

  async createSpecialty(createDto: CreateSpecialtyDto): Promise<Specialty> {
    // Check if specialty already exists
    const existing = await this.specialtyModel.findOne({
      name: { $regex: new RegExp(`^${createDto.name}$`, 'i') },
    });

    if (existing) {
      throw new BadRequestException('Specialty with this name already exists');
    }

    const specialty = new this.specialtyModel(createDto);
    return await specialty.save();
  }

  async getAllSpecialties(): Promise<Specialty[]> {
    return await this.specialtyModel.find().sort({ name: 1 }).exec();
  }

  async getSpecialty(specialtyId: string): Promise<Specialty> {
    const specialty = await this.specialtyModel.findById(specialtyId);
    if (!specialty) {
      throw new NotFoundException('Specialty not found');
    }
    return specialty;
  }

  async updateSpecialty(
    specialtyId: string,
    updateDto: UpdateSpecialtyDto,
  ): Promise<Specialty> {
    // Check if name is being updated and already exists
    if (updateDto.name) {
      const existing = await this.specialtyModel.findOne({
        name: { $regex: new RegExp(`^${updateDto.name}$`, 'i') },
        _id: { $ne: specialtyId },
      });

      if (existing) {
        throw new BadRequestException(
          'Specialty with this name already exists',
        );
      }
    }

    const updated = await this.specialtyModel.findByIdAndUpdate(
      specialtyId,
      updateDto,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Specialty not found');
    }

    return updated;
  }

  async deleteSpecialty(specialtyId: string): Promise<void> {
    const result = await this.specialtyModel.findByIdAndDelete(specialtyId);
    if (!result) {
      throw new NotFoundException('Specialty not found');
    }
  }

  async searchSpecialties(searchTerm: string): Promise<Specialty[]> {
    return await this.specialtyModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .sort({ name: 1 })
      .exec();
  }
}
