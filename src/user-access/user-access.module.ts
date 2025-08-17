import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAccessService } from './user-access.service';
import { UserAccessSchema } from '../database/schemas/user-access.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'UserAccess', schema: UserAccessSchema },
    ]),
    CommonModule,
  ],
  providers: [UserAccessService],
  exports: [UserAccessService],
})
export class UserAccessModule {}
