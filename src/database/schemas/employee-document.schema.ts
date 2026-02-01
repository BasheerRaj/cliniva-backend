import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'employee_documents',
})
export class EmployeeDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'contract',
      'certificate',
      'work_permit',
      'cv',
      'id_copy',
      'diploma',
      'license',
      'insurance',
      'other',
    ],
  })
  documentType: string;

  @Prop({ required: true })
  documentName: string; // Display name for the document

  @Prop({ required: true })
  fileUrl: string; // Storage URL (S3, local storage, etc.)

  @Prop()
  fileName?: string; // Original file name

  @Prop()
  fileSize?: number; // File size in bytes

  @Prop()
  mimeType?: string; // File type (pdf, jpg, png, etc.)

  @Prop()
  issueDate?: Date; // Date document was issued

  @Prop()
  expiryDate?: Date; // Expiry date (for permits, licenses, etc.)

  @Prop()
  issuingAuthority?: string; // Who issued the document

  @Prop()
  documentNumber?: string; // Document reference number

  @Prop({
    default: 'active',
    enum: ['active', 'expired', 'revoked', 'pending_renewal', 'archived'],
  })
  status: string;

  @Prop({ default: false })
  isVerified: boolean; // Whether document has been verified

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId; // Who verified the document

  @Prop()
  verifiedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId; // Who uploaded the document

  @Prop()
  notes?: string; // Additional notes about the document

  @Prop({ default: true })
  isActive: boolean;
}

export const EmployeeDocumentSchema =
  SchemaFactory.createForClass(EmployeeDocument);

// Indexes
EmployeeDocumentSchema.index({ userId: 1 });
EmployeeDocumentSchema.index({ documentType: 1 });
EmployeeDocumentSchema.index({ status: 1 });
EmployeeDocumentSchema.index({ expiryDate: 1 });
EmployeeDocumentSchema.index({ isVerified: 1 });
EmployeeDocumentSchema.index({ userId: 1, documentType: 1 });
