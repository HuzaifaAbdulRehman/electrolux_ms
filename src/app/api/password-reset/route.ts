import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { passwordResetRequests, users, customers } from '@/lib/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// POST /api/password-reset - Submit password reset request (Public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accountNumber, userType, requestReason } = body;

    // Validation
    if (!email || !userType) {
      return NextResponse.json(
        { success: false, error: 'Email and user type are required' },
        { status: 400 }
      );
    }

    if (!['employee', 'customer'].includes(userType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user type' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // SECURITY CHECK: Only ONE pending request allowed at a time
    // User can request again after their previous request is:
    // - approved (admin has processed it), OR
    // - completed (they changed password), OR
    // - rejected by admin
    const [pendingRequest] = await db
      .select()
      .from(passwordResetRequests)
      .where(
        and(
          eq(passwordResetRequests.email, email),
          eq(passwordResetRequests.status, 'pending')
        )
      )
      .limit(1);

    if (pendingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'You already have a pending password reset request. Please wait for admin review or track your existing request.',
          existingRequestNumber: pendingRequest.requestNumber
        },
        { status: 409 }
      );
    }

    // Verify user exists
    let userId: number | null = null;
    const [user] = await db
      .select({ id: users.id, userType: users.userType, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // User not found - still create request for admin review
      // Don't reveal if user exists or not (security)
    } else {
      // Verify user type matches
      if (user.userType !== userType && user.userType !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'User type does not match our records' },
          { status: 400 }
        );
      }

      // Check if user is active
      if (user.isActive !== 1) {
        return NextResponse.json(
          { success: false, error: 'Account is inactive. Please contact admin.' },
          { status: 403 }
        );
      }

      userId = user.id;
    }

    // For customers, verify account number if provided
    if (userType === 'customer' && accountNumber) {
      const [customer] = await db
        .select({ userId: customers.userId })
        .from(customers)
        .where(eq(customers.accountNumber, accountNumber))
        .limit(1);

      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Account number not found' },
          { status: 404 }
        );
      }

      // Verify account number matches email
      if (userId && customer.userId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Account number does not match email' },
          { status: 400 }
        );
      }
    }

    // Generate unique request number
    const year = new Date().getFullYear();
    const [lastRequest] = await db
      .select({ requestNumber: passwordResetRequests.requestNumber })
      .from(passwordResetRequests)
      .orderBy(desc(passwordResetRequests.id))
      .limit(1);

    let requestNumber = '';
    if (lastRequest?.requestNumber) {
      const lastNum = parseInt(lastRequest.requestNumber.split('-')[2]);
      const nextNum = (lastNum + 1).toString().padStart(6, '0');
      requestNumber = `PWRST-${year}-${nextNum}`;
    } else {
      requestNumber = `PWRST-${year}-000001`;
    }

    // Create password reset request
    await db.insert(passwordResetRequests).values({
      requestNumber,
      userId,
      email,
      accountNumber: userType === 'customer' ? accountNumber : null,
      userType: userType as 'employee' | 'customer',
      requestReason: requestReason || null,
      status: 'pending',
      requestedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset request submitted successfully',
      data: {
        requestNumber,
        email,
        userType,
        status: 'pending',
      },
    });

  } catch (error: any) {
    console.error('Error creating password reset request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit password reset request',
        details: error.message
      },
      { status: 500 }
    );
  }
}
