import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceService } from './service.service';
import { ServiceSchema } from '../database/schemas/service.schema';
import { ClinicServiceSchema } from '../database/schemas/clinic-service.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Service', schema: ServiceSchema },
      { name: 'ClinicService', schema: ClinicServiceSchema },
    ]),
    CommonModule,
  ],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
