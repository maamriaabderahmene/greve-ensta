import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get IP from headers (multiple fallbacks)
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const cfConnecting = request.headers.get('cf-connecting-ip');
    
    let ip = forwarded?.split(',')[0].trim() || 
             real || 
             cfConnecting || 
             'unknown';

    // Normalize IPv6 localhost to IPv4
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }

    // If still unknown, try to get from request
    if (ip === 'unknown') {
      // In development, use localhost
      ip = process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'unknown';
    }

    return NextResponse.json({ 
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get IP address' },
      { status: 500 }
    );
  }
}
