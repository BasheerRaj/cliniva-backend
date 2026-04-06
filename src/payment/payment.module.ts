import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentBalanceService } from './payment-balance.service';
import { Payment, PaymentSchema } from '../database/schemas/payment.schema';
import { Invoice, InvoiceSchema } from '../database/schemas/invoice.schema';
import { Patient, PatientSchema } from '../database/schemas/patient.schema';
import { Clinic, ClinicSchema } from '../database/schemas/clinic.schema';
import { Counter, CounterSchema } from '../database/schemas/counter.schema';
import { Service, ServiceSchema } from '../database/schemas/service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentBalanceService],
  exports: [PaymentService, PaymentBalanceService],
})
export class PaymentModule {}
