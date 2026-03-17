import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'counters',
})
export class Counter extends Document {
  @Prop({ required: true, unique: true })
  key: string; // e.g. "INV:org123" or "DFT:org123"

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
CounterSchema.index({ key: 1 }, { unique: true });
