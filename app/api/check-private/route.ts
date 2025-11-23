import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to detect and block private browsing at the server level
 */
export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language');
    const dnt = request.headers.get('dnt'); // Do Not Track
    const referer = request.headers.get('referer');
    
    const suspiciousIndicators: string[] = [];

    // Check 1: Missing common headers that private browsing often strips
    if (!acceptLanguage) {
      suspiciousIndicators.push('missing-accept-language');
    }

    // Check 2: DNT header set to 1 (often enabled in private mode)
    if (dnt === '1') {
      suspiciousIndicators.push('dnt-enabled');
    }

    // Check 3: Check for incognito-specific patterns in user agent
    const incognitoPatterns = [
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i
    ];
    
    if (incognitoPatterns.some(pattern => pattern.test(userAgent))) {
      suspiciousIndicators.push('suspicious-user-agent');
    }

    // Check 4: Analyze storage headers
    const cacheControl = request.headers.get('cache-control');
    if (cacheControl?.includes('no-store') || cacheControl?.includes('no-cache')) {
      suspiciousIndicators.push('aggressive-cache-control');
    }

    return NextResponse.json({
      isPrivate: suspiciousIndicators.length > 0,
      indicators: suspiciousIndicators,
      confidence: suspiciousIndicators.length >= 2 ? 'high' : 'low'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check private mode' },
      { status: 500 }
    );
  }
}
