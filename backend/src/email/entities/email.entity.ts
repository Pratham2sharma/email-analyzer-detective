import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailDocument = HydratedDocument<Email>;

@Schema({ timestamps: true }) 
export class Email {
  @Prop({ required: true })
  subject: string;

  @Prop({ type: [String], required: true }) 
  receivingChain: string[];

  @Prop({ required: true })
  esp: string;
}

export const EmailSchema = SchemaFactory.createForClass(Email);