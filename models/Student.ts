import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendanceRecord {
  date: Date;
  location: {
    lat: number;
    lng: number;
  };
  verified: boolean;
  distance: number;
}

export interface IStudent extends Document {
  name: string;
  email: string;
  specialty: 'MI' | 'ST';
  major: string;
  attendanceRecords: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema = new Schema({
  date: {
    type: Date,
    default: Date.now
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  verified: {
    type: Boolean,
    default: false
  },
  distance: {
    type: Number,
    required: true
  }
});

const StudentSchema = new Schema<IStudent>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    specialty: {
      type: String,
      enum: ['MI', 'ST'],
      required: [true, 'Specialty is required']
    },
    major: {
      type: String,
      required: [true, 'Major is required']
    },
    attendanceRecords: [AttendanceRecordSchema]
  },
  {
    timestamps: true
  }
);

// Index for faster queries
StudentSchema.index({ email: 1 });
StudentSchema.index({ specialty: 1, major: 1 });

const Student: Model<IStudent> = 
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export default Student;
