import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import AttendanceLocation from '@/models/AttendanceLocation';
import IPTracking from '@/models/IPTracking';
import IPRegistration from '@/models/IPRegistration';
import SessionControl from '@/models/SessionControl';
import { calculateDistance } from '@/lib/utils';
import { getCurrentSession, isWithinAttendanceHours } from '@/lib/sessionUtils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const { name, email, specialty, major, latitude, longitude, browserFingerprint, deviceFingerprint, isVPN } = body;

    // Validation
    if (!name || !email || !specialty || !major || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'All fields are required: name, email, specialty, major, and location' },
        { status: 400 }
      );
    }

    // Check if VPN is detected
    if (isVPN === true) {
      return NextResponse.json(
        { error: 'VPN usage detected. Please disable your VPN to mark attendance.' },
        { status: 403 }
      );
    }

    // Check device fingerprint
    if (!deviceFingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint required. Please refresh the page.' },
        { status: 400 }
      );
    }

    // Check if within attendance hours
    if (!isWithinAttendanceHours()) {
      return NextResponse.json(
        { error: 'Attendance can only be marked during authorized hours (8:00 AM - End of Day).' },
        { status: 400 }
      );
    }

    // Get current session
    const currentSession = getCurrentSession();
    if (!currentSession) {
      return NextResponse.json(
        { error: 'No active attendance session at this time.' },
        { status: 400 }
      );
    }

    // Check if session is enabled by admin
    const sessionControl = await SessionControl.findOne({ session: currentSession });
    if (sessionControl && !sessionControl.isEnabled) {
      return NextResponse.json(
        { error: 'Attendance marking is currently disabled for this session by the administrator.' },
        { status: 403 }
      );
    }

    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const cfConnecting = request.headers.get('cf-connecting-ip');
    
    let ip = forwarded?.split(',')[0].trim() || 
             real || 
             cfConnecting || 
             null;

    // Normalize IPv6 localhost to IPv4
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }

    // In development, use localhost
    if (!ip || ip === 'unknown') {
      ip = process.env.NODE_ENV === 'development' ? '127.0.0.1' : null;
    }

    if (!ip) {
      return NextResponse.json(
        { error: 'Cannot detect IP address. Please disable private browsing mode.' },
        { status: 400 }
      );
    }

    // SERVER-SIDE PRIVATE BROWSING DETECTION
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language');
    const dnt = request.headers.get('dnt');
    const cacheControl = request.headers.get('cache-control');
    
    const privateBrowsingIndicators: string[] = [];
    
    // Check for missing or suspicious headers common in private mode
    if (!acceptLanguage || acceptLanguage.length < 5) {
      privateBrowsingIndicators.push('missing-accept-language');
    }
    
    if (dnt === '1') {
      privateBrowsingIndicators.push('dnt-enabled');
    }
    
    if (cacheControl && (cacheControl.includes('no-store') || cacheControl.includes('no-cache'))) {
      privateBrowsingIndicators.push('aggressive-cache-control');
    }

    // Check browser fingerprint if provided
    if (browserFingerprint) {
      if (browserFingerprint.isPrivate === true) {
        return NextResponse.json(
          { error: 'Private/Incognito browsing is not allowed. Please use normal browsing mode.' },
          { status: 403 }
        );
      }
    }

    // If multiple indicators suggest private browsing, block it
    if (privateBrowsingIndicators.length >= 2) {
      return NextResponse.json(
        { 
          error: 'Private browsing detected by server. Please use normal browsing mode.',
          indicators: privateBrowsingIndicators 
        },
        { status: 403 }
      );
    }

    // CRITICAL: Verify IP exists in IPRegistration database
    const ipRegistration = await IPRegistration.findOne({ ipAddress: ip });
    
    if (!ipRegistration) {
      return NextResponse.json(
        { error: 'IP address not registered. Please reload the page to register your IP.' },
        { status: 403 }
      );
    }

    if (!ipRegistration.isVerified) {
      return NextResponse.json(
        { error: 'IP address is not verified. Please contact administrator.' },
        { status: 403 }
      );
    }

    // CRITICAL CHECK: Device (IP + Fingerprint) can only mark attendance ONCE per session
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if this device (IP + fingerprint) has already been used in this session today
    const existingDeviceSession = await IPTracking.findOne({
      ipAddress: ip,
      deviceFingerprint: deviceFingerprint,
      session: currentSession,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingDeviceSession) {
      return NextResponse.json(
        { 
          error: `This device has already marked attendance for this session with email: ${existingDeviceSession.email}.`,
          usedEmail: existingDeviceSession.email
        },
        { status: 400 }
      );
    }

    // Check if email has already marked attendance in this session today
    const existingEmailSession = await IPTracking.findOne({
      email: email.toLowerCase(),
      session: currentSession,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingEmailSession) {
      return NextResponse.json(
        { 
          error: `This email has already marked attendance for this session.`
        },
        { status: 400 }
      );
    }

    // Find or create student
    let student = await Student.findOne({ email: email.toLowerCase() });
    
    if (!student) {
      // Create new student
      student = await Student.create({
        name,
        email: email.toLowerCase(),
        specialty,
        major,
        attendanceRecords: []
      });
    } else {
      // Update student info if changed
      student.name = name;
      student.specialty = specialty;
      student.major = major;
    }

    // Get active attendance locations
    const activeLocations = await AttendanceLocation.find({ isActive: true });
    
    if (activeLocations.length === 0) {
      return NextResponse.json(
        { error: 'No active attendance locations available' },
        { status: 400 }
      );
    }

    // Find the closest location and check if within radius
    let closestLocation = null;
    let minDistance = Infinity;
    let isWithinRadius = false;

    for (const location of activeLocations) {
      const distance = calculateDistance(
        latitude,
        longitude,
        location.coordinates.lat,
        location.coordinates.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }

      if (distance <= location.radius) {
        isWithinRadius = true;
        break;
      }
    }

    if (!isWithinRadius) {
      return NextResponse.json(
        { 
          error: `You are ${Math.round(minDistance)} meters away from the nearest location. You must be within ${closestLocation?.radius} meters.`,
          distance: Math.round(minDistance),
          verified: false
        },
        { status: 400 }
      );
    }

    // Check if student already marked attendance in this session today
    const todayCheck = new Date();
    todayCheck.setHours(0, 0, 0, 0);
    
    const alreadyMarkedSession = student.attendanceRecords.some((record) => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === todayCheck.getTime() && record.session === currentSession;
    });

    if (alreadyMarkedSession) {
      return NextResponse.json(
        { error: 'You have already marked attendance for this session today' },
        { status: 400 }
      );
    }

    // Add attendance record with session info
    student.attendanceRecords.push({
      date: new Date(),
      session: currentSession,
      location: {
        lat: latitude,
        lng: longitude
      },
      verified: true,
      distance: Math.round(minDistance),
      deviceFingerprint: deviceFingerprint,
      addedByAdmin: false
    });

    await student.save();

    // Track IP + Device + Email + Session for today
    await IPTracking.create({
      ipAddress: ip,
      email: email.toLowerCase(),
      deviceFingerprint: deviceFingerprint,
      session: currentSession,
      date: today
    });

    return NextResponse.json(
      { 
        success: true,
        message: `Attendance marked successfully! You were ${Math.round(minDistance)} meters from ${closestLocation?.locationName}`,
        distance: Math.round(minDistance),
        location: closestLocation?.locationName,
        verified: true
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Attendance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark attendance. Please try again.' },
      { status: 500 }
    );
  }
}
