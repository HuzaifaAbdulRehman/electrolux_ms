import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { users } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    console.log('[Password Change API] Request received for user:', session.user.email);

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: 'Current password and new password are required'
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'New password must be at least 8 characters long'
      }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({
        success: false,
        error: 'New password must be different from current password'
      }, { status: 400 });
    }

    // Get user from database
    const userId = parseInt(session.user.id);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Current password is incorrect'
      }, { status: 401 });
    }

    // Hash new password with 12 salt rounds (matching registration)
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database and clear requiresPasswordChange flag
    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        requiresPasswordChange: 0,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log('[Password Change API] Password changed successfully for user:', session.user.email);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    console.error('[Password Change API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to change password',
      details: error.message
    }, { status: 500 });
  }
}

