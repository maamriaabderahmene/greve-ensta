import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import IPRegistration from '@/models/IPRegistration';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { userAgent } = await request.json();

    // Get IP from headers
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
        { error: 'Cannot detect IP address. Private browsing may be blocking IP detection.' },
        { status: 400 }
      );
    }

    // Check if IP already exists
    let ipRecord = await IPRegistration.findOne({ ipAddress: ip });

    if (ipRecord) {
      // Update existing record
      ipRecord.lastSeen = new Date();
      ipRecord.visitCount += 1;
      if (userAgent) {
        ipRecord.userAgent = userAgent;
      }
      await ipRecord.save();
    } else {
      // Create new record - use findOneAndUpdate with upsert to prevent race condition
      ipRecord = await IPRegistration.findOneAndUpdate(
        { ipAddress: ip },
        {
          $setOnInsert: {
            ipAddress: ip,
            firstSeen: new Date(),
            visitCount: 1,
            isVerified: true
          },
          $set: {
            lastSeen: new Date(),
            userAgent: userAgent || undefined
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
    }

    return NextResponse.json({
      success: true,
      ip,
      registered: true,
      firstVisit: ipRecord.visitCount === 1
    });
  } catch (error) {
    console.error('IP registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register IP address' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get IP from headers
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

    if (!ip || ip === 'unknown') {
      ip = process.env.NODE_ENV === 'development' ? '127.0.0.1' : null;
    }

    if (!ip) {
      return NextResponse.json(
        { error: 'Cannot detect IP address' },
        { status: 400 }
      );
    }

    // Check if IP exists in database
    const ipRecord = await IPRegistration.findOne({ ipAddress: ip });

    return NextResponse.json({
      ip,
      exists: !!ipRecord,
      isVerified: ipRecord?.isVerified || false,
      visitCount: ipRecord?.visitCount || 0
    });
  } catch (error) {
    console.error('IP verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify IP address' },
      { status: 500 }
    );
  }
}
