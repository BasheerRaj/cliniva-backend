import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'dynamic_info'
})
export class DynamicInfo extends Document {
  @Prop({ 
    required: true,
    enum: ['organization', 'complex', 'clinic'] 
  })
  entityType: string;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ required: true })
  infoType: string; // 'privacy_policy', 'certifications', 'awards', etc.

  @Prop()
  infoValue?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const DynamicInfoSchema = SchemaFactory.createForClass(DynamicInfo);

// Indexes
DynamicInfoSchema.index({ entityType: 1, entityId: 1 });
DynamicInfoSchema.index({ infoType: 1 });
DynamicInfoSchema.index({ entityType: 1, entityId: 1, infoType: 1 }, { unique: true });
