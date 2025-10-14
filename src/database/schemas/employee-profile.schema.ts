import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'employee_profiles'
})
export class EmployeeProfile extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop()
  employeeNumber?: string; // Unique employee identifier

  @Prop()
  cardNumber?: string; // National ID or government-issued ID

  @Prop({
    enum: ['single', 'married', 'divorced', 'widowed', 'separated', 'other']
  })
  maritalStatus?: string;

  @Prop({ default: 0 })
  numberOfChildren: number;

  @Prop()
  profilePictureUrl?: string;

  @Prop({ required: true })
  jobTitle: string; // Position/role title

  @Prop({ required: true })
  dateOfHiring: Date;

  @Prop()
  salary?: number;

  @Prop()
  bankAccount?: string; // For payroll

  @Prop()
  socialSecurityNumber?: string;

  @Prop()
  taxId?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  terminationDate?: Date;

  @Prop()
  notes?: string; // Additional notes about the employee
  @Prop({ default: false })
  isDeleted?: boolean;
}

export const EmployeeProfileSchema = SchemaFactory.createForClass(EmployeeProfile);

// Indexes (userId index is already created by unique: true in @Prop)
EmployeeProfileSchema.index({ employeeNumber: 1 }, { unique: true, sparse: true });
EmployeeProfileSchema.index({ cardNumber: 1 }, { sparse: true });
EmployeeProfileSchema.index({ dateOfHiring: 1 });
EmployeeProfileSchema.index({ isActive: 1 });
