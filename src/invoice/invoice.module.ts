import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceScopeGuard } from './guards/invoice-scope.guard';
import { Invoice, InvoiceSchema } from '../database/schemas/invoice.schema';
import { Patient, PatientSchema } from '../database/schemas/patient.schema';
import { Service, ServiceSchema } from '../database/schemas/service.schema';
import { Clinic, ClinicSchema } from '../database/schemas/clinic.schema';
import { Counter, CounterSchema } from '../database/schemas/counter.schema';
import { Payment, PaymentSchema } from '../database/schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceNumberService, InvoiceScopeGuard, InvoicePdfService],
  exports: [InvoiceService, InvoiceNumberService],
})
export class InvoiceModule {}
