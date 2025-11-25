import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import IPTracking from '@/models/IPTracking';
import type { AttendanceSession } from '@/models/Student';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    const { name, email, specialty, major, date, session: attendanceSession } = body;

    // Validation
    if (!name || !email || !specialty || !major || !date || !attendanceSession) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate session
    const validSessions: AttendanceSession[] = ['session0', 'session1', 'session2', 'session3', 'session4'];
    if (!validSessions.includes(attendanceSession as AttendanceSession)) {
      return NextResponse.json(
        { error: 'Invalid attendance session' },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find or create student
    let student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      student = await Student.create({
        name,
        email: email.toLowerCase(),
        specialty,
        major,
        attendanceRecords: []
      });
    } else {
      // Update student info
      student.name = name;
      student.specialty = specialty;
      student.major = major;
    }

    // Check if already marked attendance for this session on this date
    const existingRecord = student.attendanceRecords.find((record) => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return (
        recordDate.getTime() === attendanceDate.getTime() &&
        record.session === attendanceSession
      );
    });

    if (existingRecord) {
      return NextResponse.json(
        { error: 'Attendance already marked for this session on this date' },
        { status: 400 }
      );
    }

    // Add attendance record (marked by admin, no location required)
    student.attendanceRecords.push({
      date: attendanceDate,
      session: attendanceSession as AttendanceSession,
      location: {
        lat: 0,
        lng: 0
      },
      verified: true,
      distance: 0,
      deviceFingerprint: 'admin-added',
      addedByAdmin: true
    });

    await student.save();

    // Create IP tracking record to prevent duplicate marking
    await IPTracking.create({
      ipAddress: 'admin-added',
      email: email.toLowerCase(),
      deviceFingerprint: 'admin-added',
      session: attendanceSession,
      date: attendanceDate
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Attendance added successfully by admin'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Manual attendance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add attendance' },
      { status: 500 }
    );
  }
}
