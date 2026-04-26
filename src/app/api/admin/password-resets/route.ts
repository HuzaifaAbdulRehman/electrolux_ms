import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { passwordResetRequests, users } from '@/lib/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// GET /api/admin/password-resets - List all password reset requests (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status (optional)

    // Build query based on status filter
    const requests = status && ['pending', 'approved', 'rejected', 'completed'].includes(status)
      ? await db
          .select({
            id: passwordResetRequests.id,
            requestNumber: passwordResetRequests.requestNumber,
            userId: passwordResetRequests.userId,
            email: passwordResetRequests.email,
            accountNumber: passwordResetRequests.accountNumber,
            userType: passwordResetRequests.userType,
            requestReason: passwordResetRequests.requestReason,
            status: passwordResetRequests.status,
            tempPasswordPlain: passwordResetRequests.tempPasswordPlain,
            requestedAt: passwordResetRequests.requestedAt,
            processedAt: passwordResetRequests.processedAt,
            processedBy: passwordResetRequests.processedBy,
            expiresAt: passwordResetRequests.expiresAt,
            rejectionReason: passwordResetRequests.rejectionReason,
          })
          .from(passwordResetRequests)
          .where(eq(passwordResetRequests.status, status as any))
          .orderBy(desc(passwordResetRequests.requestedAt))
      : await db
          .select({
            id: passwordResetRequests.id,
            requestNumber: passwordResetRequests.requestNumber,
            userId: passwordResetRequests.userId,
            email: passwordResetRequests.email,
            accountNumber: passwordResetRequests.accountNumber,
            userType: passwordResetRequests.userType,
            requestReason: passwordResetRequests.requestReason,
            status: passwordResetRequests.status,
            tempPasswordPlain: passwordResetRequests.tempPasswordPlain,
            requestedAt: passwordResetRequests.requestedAt,
            processedAt: passwordResetRequests.processedAt,
            processedBy: passwordResetRequests.processedBy,
            expiresAt: passwordResetRequests.expiresAt,
            rejectionReason: passwordResetRequests.rejectionReason,
          })
          .from(passwordResetRequests)
          .orderBy(desc(passwordResetRequests.requestedAt));

    return NextResponse.json({
      success: true,
      data: requests
    });

  } catch (error: any) {
    console.error('Error fetching password reset requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requests', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/password-resets - Process password reset request (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action, rejectionReason } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    // Fetch the request
    const [resetRequest] = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.id, requestId))
      .limit(1);

    if (!resetRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    if (resetRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    const adminUserId = parseInt(session.user.id);

    // Handle different actions
    if (action === 'approve') {
      // Generate temporary password
      const tempPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Set expiration (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update user's password and set requiresPasswordChange flag
      if (!resetRequest.userId) {
        return NextResponse.json(
          { success: false, error: 'User not found in system' },
          { status: 404 }
        );
      }

      await db
        .update(users)
        .set({
          password: hashedPassword,
          requiresPasswordChange: 1,
        })
        .where(eq(users.id, resetRequest.userId));

      // Update reset request
      await db
        .update(passwordResetRequests)
        .set({
          status: 'approved',
          tempPasswordPlain: tempPassword, // Store plain for admin display (one-time)
          processedAt: new Date(),
          processedBy: adminUserId,
          expiresAt,
        })
        .where(eq(passwordResetRequests.id, requestId));

      return NextResponse.json({
        success: true,
        message: 'Password reset approved. Temporary password generated.',
        data: {
          requestNumber: resetRequest.requestNumber,
          email: resetRequest.email,
          temporaryPassword: tempPassword,
          expiresAt,
        }
      });

    } else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      // Update reset request
      await db
        .update(passwordResetRequests)
        .set({
          status: 'rejected',
          rejectionReason,
          processedAt: new Date(),
          processedBy: adminUserId,
        })
        .where(eq(passwordResetRequests.id, requestId));

      return NextResponse.json({
        success: true,
        message: 'Password reset request rejected',
        data: {
          requestNumber: resetRequest.requestNumber,
          status: 'rejected',
        }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error processing password reset request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate random password
function generateRandomPassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@#$%&*';
  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';

  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
