import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import SessionControl from '@/models/SessionControl';
import type { AttendanceSession } from '@/models/Student';

// GET - Fetch all session statuses
export async function GET() {
  try {
    await connectDB();

    // Get all sessions
    const sessions = await SessionControl.find({}).sort({ session: 1 });

    // If no sessions exist, create default ones (all enabled)
    if (sessions.length === 0) {
      const defaultSessions: AttendanceSession[] = ['session0', 'session1', 'session2', 'session3', 'session4'];
      const created = await SessionControl.insertMany(
        defaultSessions.map(s => ({ session: s, isEnabled: true }))
      );
      return NextResponse.json({ sessions: created }, { status: 200 });
    }

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error: any) {
    console.error('Session control GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session controls' },
      { status: 500 }
    );
  }
}

// POST - Update session status
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { session: sessionId, isEnabled } = body;

    if (!sessionId || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Session and isEnabled fields are required' },
        { status: 400 }
      );
    }

    // Validate session
    const validSessions: AttendanceSession[] = ['session0', 'session1', 'session2', 'session3', 'session4'];
    if (!validSessions.includes(sessionId as AttendanceSession)) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      );
    }

    // Update or create session control
    const sessionControl = await SessionControl.findOneAndUpdate(
      { session: sessionId },
      {
        isEnabled,
        updatedBy: session.user?.email || 'admin'
      },
      {
        upsert: true,
        new: true
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: `Session ${sessionId} ${isEnabled ? 'enabled' : 'disabled'} successfully`,
        sessionControl
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Session control POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update session control' },
      { status: 500 }
    );
  }
}
