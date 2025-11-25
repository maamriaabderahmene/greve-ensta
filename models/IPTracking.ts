import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIPTracking extends Document {
  ipAddress: string;
  email: string;
  deviceFingerprint: string;
  session: string; // session1, session2, session3, session4
  date: Date;
  createdAt: Date;
}

const IPTrackingSchema = new Schema<IIPTracking>(
  {
    ipAddress: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    deviceFingerprint: {
      type: String,
      required: true,
      trim: true
    },
    session: {
      type: String,
      required: true,
      enum: ['session1', 'session2', 'session3', 'session4']
    },
    date: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for IP + Device + Session + Date
IPTrackingSchema.index({ ipAddress: 1, deviceFingerprint: 1, session: 1, date: 1 });

const IPTracking: Model<IIPTracking> = 
  mongoose.models.IPTracking || mongoose.model<IIPTracking>('IPTracking', IPTrackingSchema);

export default IPTracking;
