import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { employees } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

// In a real app, you'd have a separate settings table
// For now, we'll use localStorage on client side and just validate session

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = parseInt(session.user.id);
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId));

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Return basic employee data for settings
    return NextResponse.json({
      success: true,
      data: {
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        assignedZone: employee.assignedZone
      }
    });

  } catch (error: any) {
    console.error('[Employee Settings API] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch settings',
      details: error.message
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = parseInt(session.user.id);
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId));

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { phone } = body;

    // Update only phone (other settings stored client-side)
    if (phone) {
      await db.update(employees)
        .set({ phone })
        .where(eq(employees.id, employee.id));
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error: any) {
    console.error('[Employee Settings API] Error updating:', error);
    return NextResponse.json({
      error: 'Failed to update settings',
      details: error.message
    }, { status: 500 });
  }
}

