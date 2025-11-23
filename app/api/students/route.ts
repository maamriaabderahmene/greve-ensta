import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const specialty = searchParams.get('specialty');
    const major = searchParams.get('major');
    const search = searchParams.get('search');

    let query: any = {};
    
    if (specialty) query.specialty = specialty;
    if (major) query.major = major;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ students }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
