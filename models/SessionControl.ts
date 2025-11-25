import mongoose, { Schema, Document, Model } from 'mongoose';
import type { AttendanceSession } from './Student';

export interface ISessionControl extends Document {
  session: AttendanceSession;
  isEnabled: boolean;
  updatedAt: Date;
  updatedBy?: string; // Admin email who last updated
}

const SessionControlSchema = new Schema<ISessionControl>(
  {
    session: {
      type: String,
      enum: ['session0', 'session1', 'session2', 'session3', 'session4'],
      required: true,
      unique: true
    },
    isEnabled: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const SessionControl: Model<ISessionControl> = 
  mongoose.models.SessionControl || mongoose.model<ISessionControl>('SessionControl', SessionControlSchema);

export default SessionControl;
