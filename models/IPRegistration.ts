import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIPRegistration extends Document {
  ipAddress: string;
  firstSeen: Date;
  lastSeen: Date;
  visitCount: number;
  isVerified: boolean;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IPRegistrationSchema = new Schema<IIPRegistration>(
  {
    ipAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    firstSeen: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      required: true,
      default: Date.now
    },
    visitCount: {
      type: Number,
      required: true,
      default: 1
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: true
    },
    userAgent: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster IP lookups
IPRegistrationSchema.index({ ipAddress: 1 });

const IPRegistration: Model<IIPRegistration> = 
  mongoose.models.IPRegistration || mongoose.model<IIPRegistration>('IPRegistration', IPRegistrationSchema);

export default IPRegistration;
