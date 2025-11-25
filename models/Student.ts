import mongoose, { Schema, Document, Model } from 'mongoose';

export type AttendanceSession = 'session0' | 'session1' | 'session2' | 'session3' | 'session4';

export interface IAttendanceRecord {
  date: Date;
  session: AttendanceSession; // session0: 12:00AM-8:00AM, session1: 8:00-9:30, session2: 9:30-11:00, session3: 11:00-12:30, session4: 12:30+
  location: {
    lat: number;
    lng: number;
  };
  verified: boolean;
  distance: number;
  deviceFingerprint?: string;
  addedByAdmin?: boolean; // Track if manually added by admin
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
  session: {
    type: String,
    enum: ['session0', 'session1', 'session2', 'session3', 'session4'],
    required: true
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
  },
  deviceFingerprint: {
    type: String
  },
  addedByAdmin: {
    type: Boolean,
    default: false
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
