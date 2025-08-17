import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

@Schema({
  timestamps: true,
  collection: 'user_access'
})
export class UserAccess extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['organization', 'complex', 'department', 'clinic'] 
  })
  scopeType: string;

  @Prop({ type: Types.ObjectId, required: true })
  scopeId: Types.ObjectId;

  @Prop({ 
    type: String,
    required: true,
    enum: Object.values(UserRole)
  })
  role: UserRole; // 'super_admin', 'owner', 'admin', 'manager', 'doctor', 'staff', 'department_head'
}

export const UserAccessSchema = SchemaFactory.createForClass(UserAccess);

// Indexes
UserAccessSchema.index({ userId: 1 });
UserAccessSchema.index({ scopeType: 1, scopeId: 1 });
UserAccessSchema.index({ userId: 1, scopeType: 1, scopeId: 1, role: 1 }, { unique: true });
