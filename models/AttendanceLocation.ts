import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendanceLocation extends Document {
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceLocationSchema = new Schema<IAttendanceLocation>(
  {
    locationName: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: -180,
        max: 180
      }
    },
    radius: {
      type: Number,
      default: 100,
      min: 10,
      max: 1000
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for active locations
AttendanceLocationSchema.index({ isActive: 1 });

const AttendanceLocation: Model<IAttendanceLocation> = 
  mongoose.models.AttendanceLocation || 
  mongoose.model<IAttendanceLocation>('AttendanceLocation', AttendanceLocationSchema);

export default AttendanceLocation;
