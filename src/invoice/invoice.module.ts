import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoiceScopeGuard } from './guards/invoice-scope.guard';
import { Invoice, InvoiceSchema } from '../database/schemas/invoice.schema';
import { Patient, PatientSchema } from '../database/schemas/patient.schema';
import { Service, ServiceSchema } from '../database/schemas/service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceNumberService, InvoiceScopeGuard],
  exports: [InvoiceService, InvoiceNumberService],
})
export class InvoiceModule {}
