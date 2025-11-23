import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware that redirects to login if no session cookie exists
export function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    // Check for NextAuth session token
    const token = request.cookies.get('authjs.session-token') || 
                  request.cookies.get('__Secure-authjs.session-token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
