import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplexService } from './complex.service';
import { ComplexController } from './complex.controller';
import { ComplexSchema } from '../database/schemas/complex.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CommonModule } from '../common/common.module';
import { DepartmentModule } from '../department/department.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Complex', schema: ComplexSchema }]),
    SubscriptionModule,
    CommonModule,
    DepartmentModule,
  ],
  controllers: [ComplexController],
  providers: [ComplexService],
  exports: [ComplexService],
})
export class ComplexModule {}
