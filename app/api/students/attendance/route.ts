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
    const now = new Date();
    const currentSession = getCurrentSession();
    console.log(`[Session Detection] Current time: ${now.toISOString()}, Detected session: ${currentSession}`);
    
    if (!currentSession) {
      return NextResponse.json(
        { error: 'No active attendance session at this time.' },
        { status: 400 }
      );
    }

    // Check if session is enabled by admin
    // If SessionControl doesn't exist for this session, assume it's enabled (backward compatibility)
    const sessionControl = await SessionControl.findOne({ session: currentSession });
    if (sessionControl && !sessionControl.isEnabled) {
      return NextResponse.json(
        { error: 'Attendance marking is currently disabled for this session by the administrator.' },
        { status: 403 }
      );
    }
    
    // If sessionControl doesn't exist for this session, create it as enabled (auto-migration)
    if (!sessionControl) {
      try {
        await SessionControl.create({
          session: currentSession,
          isEnabled: true,
          updatedBy: 'auto-migration',
          updatedAt: new Date()
        });
      } catch (err) {
        // Ignore duplicate key errors (race condition)
        console.log('SessionControl auto-creation:', err);
      }
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

    // CRITICAL: Check if this device (IP + fingerprint) has already been used in THIS SPECIFIC session today
    // This allows the same device to mark attendance in different sessions
    // Query explicitly checks: same IP + same device + SAME SESSION (exact match, not null) + same day
    const existingDeviceSession = await IPTracking.findOne({
      ipAddress: ip,
      deviceFingerprint: deviceFingerprint,
      session: { $eq: currentSession }, // Use $eq to ensure EXACT match (not null/undefined)
      date: { $gte: today, $lt: tomorrow }
    }).lean();

    console.log(`[Device Check] IP: ${ip}, Device: ${deviceFingerprint.substring(0, 10)}..., Session: ${currentSession}, Found: ${!!existingDeviceSession}`);

    if (existingDeviceSession) {
      return NextResponse.json(
        { 
          error: `This device has already marked attendance for ${currentSession} with email: ${existingDeviceSession.email}. You can mark attendance in other sessions.`,
          usedEmail: existingDeviceSession.email,
          session: currentSession
        },
        { status: 400 }
      );
    }

    // CRITICAL: Check if email has already marked attendance in THIS SPECIFIC session today
    // This allows the same email to mark attendance in different sessions throughout the day
    // Query explicitly checks: same email + SAME SESSION (exact match, not null) + same day
    
    // First, let's check ALL records for this email today to debug
    const allEmailRecordsToday = await IPTracking.find({
      email: email.toLowerCase(),
      date: { $gte: today, $lt: tomorrow }
    }).lean();
    
    console.log(`[DEBUG] All IPTracking records for ${email} today:`, allEmailRecordsToday.map(r => ({ session: r.session, date: r.date })));
    
    const existingEmailSession = await IPTracking.findOne({
      email: email.toLowerCase(),
      session: { $eq: currentSession }, // Use $eq to ensure EXACT match (not null/undefined)
      date: { $gte: today, $lt: tomorrow }
    }).lean();

    console.log(`[Email Check] Email: ${email}, Current Session: ${currentSession}, Found in THIS session: ${!!existingEmailSession}`);

    if (existingEmailSession) {
      return NextResponse.json(
        { 
          error: `You have already marked attendance for ${currentSession} today. You can mark attendance in other sessions.`,
          session: currentSession,
          markedAt: existingEmailSession.createdAt
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

    // Check if student already marked attendance in this specific session today
    const todayCheck = new Date();
    todayCheck.setHours(0, 0, 0, 0);
    
    // Log today's attendance records for debugging
    const todayRecords = student.attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === todayCheck.getTime();
    });
    
    console.log(`[Student Record Check] Email: ${email}, Current Session: ${currentSession}`);
    console.log(`[Today's Records] Count: ${todayRecords.length}`, todayRecords.map(r => ({ session: r.session, date: r.date })));
    
    const alreadyMarkedSession = student.attendanceRecords.some((record) => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      // Must match both: same day AND EXACT same session (strict equality, not null/undefined)
      const sameDay = recordDate.getTime() === todayCheck.getTime();
      const sameSession = record.session === currentSession && record.session !== null && record.session !== undefined;
      
      if (sameDay && record.session) {
        console.log(`  - Record session: ${record.session}, Current: ${currentSession}, Match: ${sameSession}`);
      }
      
      return sameDay && sameSession;
    });

    console.log(`[Already Marked?] ${alreadyMarkedSession}`);

    if (alreadyMarkedSession) {
      return NextResponse.json(
        { 
          error: `You have already marked attendance for ${currentSession} today. You can still mark attendance in other sessions.`,
          session: currentSession
        },
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

    // Save without validating old records (for backward compatibility)
    // Only the new record we just pushed will be validated
    await student.save({ validateModifiedOnly: true });

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
