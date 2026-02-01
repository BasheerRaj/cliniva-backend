import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionsEnum } from '../../common/enums/permissions.enum';

@Schema({
  timestamps: true,
  collection: 'user_access',
})
export class UserAccess extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['organization', 'complex', 'department', 'clinic'],
  })
  scopeType: string;

  @Prop({ type: Types.ObjectId, required: true })
  scopeId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserRole),
  })
  role: UserRole; // 'super_admin', 'owner', 'admin', 'manager', 'doctor', 'staff', 'department_head'

  @Prop({ type: [String], enum: Object.values(PermissionsEnum), default: [] })
  customPermissions?: PermissionsEnum[];

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  grantedBy?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  grantedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Date })
  updatedAt?: Date;

  @Prop({ type: String })
  notes?: string;
}

export const UserAccessSchema = SchemaFactory.createForClass(UserAccess);

// Indexes
UserAccessSchema.index({ userId: 1 });
UserAccessSchema.index({ scopeType: 1, scopeId: 1 });
UserAccessSchema.index(
  { userId: 1, scopeType: 1, scopeId: 1, role: 1 },
  { unique: true },
);
