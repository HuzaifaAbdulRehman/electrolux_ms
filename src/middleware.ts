import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if user requires password change
    if (token?.requiresPasswordChange === 1) {
      // If user requires password change and is not on the change-password page, redirect
      if (!path.startsWith('/change-password') && !path.startsWith('/api/auth')) {
        return NextResponse.redirect(new URL('/change-password', req.url));
      }
    } else {
      // If user doesn't require password change but is on change-password page, redirect to dashboard
      if (path.startsWith('/change-password')) {
        const dashboardPath = token?.userType === 'admin' ? '/admin/dashboard'
          : token?.userType === 'employee' ? '/employee/dashboard'
          : '/customer/dashboard';
        return NextResponse.redirect(new URL(dashboardPath, req.url));
      }
    }

    // Role-based access control
    if (path.startsWith('/admin') && token?.userType !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (path.startsWith('/employee') && token?.userType !== 'employee') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (path.startsWith('/customer') && token?.userType !== 'customer') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect these routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/employee/:path*',
    '/customer/:path*',
    '/change-password',
    '/api/admin/:path*',
    '/api/employee/:path*',
    '/api/customer/:path*',
  ],
};

