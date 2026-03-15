import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { passwordResetRequests } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

// GET /api/password-reset/track?requestNumber=PWRST-2025-XXXXXX
// Public endpoint - no authentication required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestNumber = searchParams.get('requestNumber');

    if (!requestNumber) {
      return NextResponse.json(
        { success: false, error: 'Request number is required' },
        { status: 400 }
      );
    }

    // Fetch password reset request by request number
    const [resetRequest] = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.requestNumber, requestNumber))
      .limit(1);

    if (!resetRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found. Please check your request number.' },
        { status: 404 }
      );
    }

    // Check if temporary password is expired
    let isExpired = false;
    if (resetRequest.expiresAt && resetRequest.status === 'approved') {
      isExpired = new Date() > new Date(resetRequest.expiresAt);
    }

    // Return request details
    return NextResponse.json({
      success: true,
      data: {
        requestNumber: resetRequest.requestNumber,
        email: resetRequest.email,
        userType: resetRequest.userType,
        status: resetRequest.status,
        requestedAt: resetRequest.requestedAt,
        processedAt: resetRequest.processedAt,
        // Only show temp password if approved and not expired
        temporaryPassword: (resetRequest.status === 'approved' && !isExpired)
          ? resetRequest.tempPasswordPlain
          : null,
        expiresAt: resetRequest.expiresAt,
        isExpired,
        rejectionReason: resetRequest.status === 'rejected'
          ? resetRequest.rejectionReason
          : null,
      }
    });

  } catch (error: any) {
    console.error('Error tracking password reset request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch request details',
        details: error.message
      },
      { status: 500 }
    );
  }
}
