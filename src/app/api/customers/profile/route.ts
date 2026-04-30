import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, users, meterReadings } from '@/lib/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer data based on user ID
    const userId = parseInt(session.user.id, 10);

    const [customerData] = await db
      .select({
        id: customers.id,
        accountNumber: customers.accountNumber,
        meterNumber: customers.meterNumber,
        zone: customers.zone,
        fullName: customers.fullName,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        city: customers.city,
        state: customers.state,
        pincode: customers.pincode,
        connectionType: customers.connectionType,
        status: customers.status,
        connectionDate: customers.connectionDate,
        dateOfBirth: customers.dateOfBirth,
        lastBillAmount: customers.lastBillAmount,
        lastPaymentDate: customers.lastPaymentDate,
        averageMonthlyUsage: customers.averageMonthlyUsage,
        outstandingBalance: customers.outstandingBalance,
        paymentStatus: customers.paymentStatus,
      })
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customerData) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    // Fetch the latest meter reading for this customer
    const [latestReading] = await db
      .select({
        currentReading: meterReadings.currentReading,
        readingDate: meterReadings.readingDate,
      })
      .from(meterReadings)
      .where(eq(meterReadings.customerId, customerData.id))
      .orderBy(desc(meterReadings.readingDate))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        ...customerData,
        lastReading: latestReading?.currentReading || null,
        lastReadingDate: latestReading?.readingDate || null,
      },
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const body = await request.json();

    // Validate required fields
    if (!body.fullName || body.fullName.trim() === '') {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!body.email || !/^\S+@\S+\.\S+$/.test(body.email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Prepare update data for customers table
    const customerUpdateData: any = {
      fullName: body.fullName.trim(),
      email: body.email.trim(),
      phone: body.phone || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      dateOfBirth: body.dateOfBirth || null,
    };

    // 🔒 TRANSACTION FIX: Wrap both updates in a transaction for atomicity
    await db.transaction(async (tx) => {
    // Update customers table
    await tx
      .update(customers)
      .set(customerUpdateData)
      .where(eq(customers.userId, userId));

    // IMPORTANT: Also update the users table to keep names synchronized
    // This ensures the session name and profile name stay in sync
    await tx
      .update(users)
      .set({
        name: body.fullName.trim(),
        email: body.email.trim(),
      })
      .where(eq(users.id, userId));

    });  // End transaction

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

