import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const students = await Student.find({}).sort({ createdAt: -1 });

    // Generate CSV
    const headers = ['Name', 'Email', 'Specialty', 'Major', 'Date', 'Latitude', 'Longitude', 'Distance (m)', 'Verified'];
    const rows = [headers];

    students.forEach(student => {
      student.attendanceRecords.forEach(record => {
        rows.push([
          student.name,
          student.email,
          student.specialty,
          student.major,
          new Date(record.date).toLocaleString(),
          record.location.lat.toString(),
          record.location.lng.toString(),
          record.distance.toString(),
          record.verified ? 'Yes' : 'No'
        ]);
      });
    });

    const csv = rows.map(row => row.join(',')).join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
