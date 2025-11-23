import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import AttendanceLocation from '@/models/AttendanceLocation';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const locations = await AttendanceLocation.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ locations }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch locations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    
    const { locationName, lat, lng, radius, isActive } = body;

    // Validation
    if (!locationName || !lat || !lng) {
      return NextResponse.json(
        { error: 'Location name and coordinates are required' },
        { status: 400 }
      );
    }

    const location = await AttendanceLocation.create({
      locationName,
      coordinates: { lat, lng },
      radius: radius || 100,
      isActive: isActive !== undefined ? isActive : true
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Location created successfully',
        location
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create location error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create location' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    
    const { id, locationName, lat, lng, radius, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const location = await AttendanceLocation.findByIdAndUpdate(
      id,
      {
        locationName,
        coordinates: { lat, lng },
        radius,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Location updated successfully',
        location
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update location error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const location = await AttendanceLocation.findByIdAndDelete(id);

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Location deleted successfully'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete location error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete location' },
      { status: 500 }
    );
  }
}
