import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { users, customers } from '@/lib/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schema for existing meter registration
const registerExistingSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(11, 'Phone number must be 11 digits').max(11, 'Phone number must be 11 digits'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().length(5, 'Pincode must be 5 digits'),
  meterNumber: z.string().min(6, 'Meter number is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validatedData = registerExistingSchema.parse(body);
    
    const {
      email,
      password,
      fullName,
      phone,
      address,
      city,
      state,
      pincode,
      meterNumber
    } = validatedData;

    // Check if email already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email address is already registered' },
        { status: 409 }
      );
    }

    // Check if phone number already exists
    const existingPhone = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existingPhone.length > 0) {
      return NextResponse.json(
        { error: 'Phone number is already registered' },
        { status: 409 }
      );
    }

    // Verify meter number exists and is available
    const existingMeter = await db
      .select({
        id: customers.id,
        meterNumber: customers.meterNumber,
        status: customers.status,
        userId: customers.userId
      })
      .from(customers)
      .where(eq(customers.meterNumber, meterNumber.trim()))
      .limit(1);

    if (existingMeter.length === 0) {
      return NextResponse.json(
        { error: 'Meter number not found in our system' },
        { status: 404 }
      );
    }

    const meterData = existingMeter[0];

    // Check if meter is already assigned to an active user
    if (meterData.userId && meterData.status === 'active') {
      return NextResponse.json(
        { error: 'This meter number is already assigned to an active customer' },
        { status: 409 }
      );
    }

    // Check if meter is in pending installation
    if (meterData.status === 'pending_installation') {
      return NextResponse.json(
        { error: 'This meter is currently pending installation. Please wait for installation to complete.' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user account
    const [newUserResult] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        userType: 'customer',
        name: fullName,
        phone,
        isActive: 1,
      })
      .$returningId();

    // Update customer record with user ID and activate
    await db
      .update(customers)
      .set({
        userId: newUserResult.id,
        fullName,
        address,
        city,
        state,
        pincode,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(customers.id, meterData.id));

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now login with your credentials.',
      data: {
        userId: newUserResult.id,
        email,
        fullName,
        phone,
        meterNumber: meterData.meterNumber,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

