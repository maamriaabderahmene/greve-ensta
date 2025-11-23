import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIPTracking extends Document {
  ipAddress: string;
  email: string;
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
    date: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for IP + Email + Date (day)
IPTrackingSchema.index({ ipAddress: 1, email: 1, date: 1 });

const IPTracking: Model<IIPTracking> = 
  mongoose.models.IPTracking || mongoose.model<IIPTracking>('IPTracking', IPTrackingSchema);

export default IPTracking;
