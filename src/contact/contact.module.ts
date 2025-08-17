import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactService } from './contact.service';
import { ContactSchema } from '../database/schemas/contact.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Contact', schema: ContactSchema },
    ]),
    CommonModule,
  ],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
