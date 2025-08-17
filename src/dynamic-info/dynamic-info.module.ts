import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicInfoService } from './dynamic-info.service';
import { DynamicInfoSchema } from '../database/schemas/dynamic-info.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DynamicInfo', schema: DynamicInfoSchema },
    ]),
    CommonModule,
  ],
  providers: [DynamicInfoService],
  exports: [DynamicInfoService],
})
export class DynamicInfoModule {}
