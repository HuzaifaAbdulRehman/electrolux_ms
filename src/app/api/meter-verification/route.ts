import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { customers } from '@/lib/drizzle/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/meter-verification - Verify meter number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meterNumber } = body;

    if (!meterNumber || typeof meterNumber !== 'string') {
      return NextResponse.json(
        { error: 'Meter number is required' },
        { status: 400 }
      );
    }

    const trimmedMeterNumber = meterNumber.trim();

    if (trimmedMeterNumber.length < 6) {
      return NextResponse.json(
        { error: 'Meter number must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if meter number exists in the database
    const existingCustomer = await db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        email: customers.email,
        phone: customers.phone,
        meterNumber: customers.meterNumber,
        status: customers.status,
        userId: customers.userId
      })
      .from(customers)
      .where(eq(customers.meterNumber, trimmedMeterNumber))
      .limit(1);

    if (existingCustomer.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Meter number not found in our system. Please check the number or contact support.' 
        },
        { status: 404 }
      );
    }

    const customer = existingCustomer[0];

    // Check if meter is already assigned to an active customer
    if (customer.userId && customer.status === 'active') {
      return NextResponse.json(
        { 
          success: false,
          error: 'This meter number is already assigned to an active customer account.' 
        },
        { status: 409 }
      );
    }

    // Check if meter is in pending installation status
    if (customer.status === 'pending_installation') {
      return NextResponse.json(
        { 
          success: false,
          error: 'This meter is currently pending installation. Please wait for installation to complete or contact support.' 
        },
        { status: 409 }
      );
    }

    // Check if meter is inactive/suspended
    if (customer.status === 'inactive' || customer.status === 'suspended') {
      return NextResponse.json(
        { 
          success: false,
          error: 'This meter is currently inactive. Please contact support for assistance.' 
        },
        { status: 409 }
      );
    }

    // Meter is available for registration
    return NextResponse.json({
      success: true,
      data: {
        meterNumber: customer.meterNumber,
        ownerName: customer.fullName,
        status: customer.status,
        message: 'Meter number verified successfully. You can proceed with registration.'
      }
    });

  } catch (error) {
    console.error('Meter verification error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify meter number. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

