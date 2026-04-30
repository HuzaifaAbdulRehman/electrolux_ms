import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { users, customers, employees } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch current user's profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const userType = session.user.userType;

    console.log(`[Profile API] Fetching profile for user ${userId} (${userType})`);

    // Fetch user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let profileData: any = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      userType: user.userType,
    };

    // Fetch additional data based on user type
    if (userType === 'customer') {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, userId))
        .limit(1);

      if (customer) {
        profileData = {
          ...profileData,
          fullName: customer.fullName,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          accountNumber: customer.accountNumber,
          meterNumber: customer.meterNumber,
          connectionType: customer.connectionType,
        };
      }
    } else if (userType === 'employee') {
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.userId, userId))
        .limit(1);

      if (employee) {
        profileData = {
          ...profileData,
          employeeName: employee.employeeName,
          designation: employee.designation,
          department: employee.department,
          assignedZone: employee.assignedZone,
        };
      }
    }

    console.log(`[Profile API] Profile fetched successfully for ${userType}`);

    return NextResponse.json({
      success: true,
      data: profileData,
      message: 'Profile fetched successfully',
    });
  } catch (error: any) {
    console.error('[Profile API] Error fetching profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const userType = session.user.userType;
    const body = await request.json();

    console.log(`[Profile API] Updating profile for user ${userId} (${userType})`);

    // Validate required fields
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Update users table
    await db
      .update(users)
      .set({
        name: body.name,
        phone: body.phone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Update type-specific tables
    if (userType === 'customer' && body.address) {
      await db
        .update(customers)
        .set({
          fullName: body.name,
          phone: body.phone,
          address: body.address,
          city: body.city || '',
          state: body.state || '',
          pincode: body.pincode || '',
          updatedAt: new Date(),
        })
        .where(eq(customers.userId, userId));
    } else if (userType === 'employee') {
      await db
        .update(employees)
        .set({
          employeeName: body.name,
          phone: body.phone,
          updatedAt: new Date(),
        })
        .where(eq(employees.userId, userId));
    }

    console.log(`[Profile API] Profile updated successfully for ${userType}`);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('[Profile API] Error updating profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to update profile',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

