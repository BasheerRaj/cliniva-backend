import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpecialtyController } from './specialty.controller';
import { SpecialtyService } from './specialty.service';
import { SpecialtySchema } from '../database/schemas/specialty.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Specialty', schema: SpecialtySchema }]),
  ],
  controllers: [SpecialtyController],
  providers: [SpecialtyService],
  exports: [SpecialtyService],
})
export class SpecialtyModule {}
