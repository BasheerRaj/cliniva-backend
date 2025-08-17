import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'insurance_claims'
})
export class InsuranceClaim extends Document {
  @Prop({ required: true, unique: true })
  claimNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ required: true })
  insuranceProvider: string;

  @Prop({ required: true })
  policyNumber: string;

  @Prop({ required: true, type: Number })
  claimAmount: number;

  @Prop({ default: 0, type: Number })
  approvedAmount: number;

  @Prop({ 
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'paid'],
    default: 'submitted' 
  })
  status: string;

  @Prop({ required: true })
  submissionDate: Date;

  @Prop()
  responseDate?: Date;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const InsuranceClaimSchema = SchemaFactory.createForClass(InsuranceClaim);

// Indexes (claimNumber index is already created by unique: true in @Prop)
InsuranceClaimSchema.index({ patientId: 1 });
InsuranceClaimSchema.index({ status: 1 });
InsuranceClaimSchema.index({ submissionDate: 1 });
