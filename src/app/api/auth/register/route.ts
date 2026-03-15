import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { users, customers } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateMeterNumber, isValidMeterNumber, isMeterNumberAvailable } from '@/lib/utils/meterNumberGenerator';

// Registration schema validation
const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^0\d{10}$/, 'Phone number must be 11 digits starting with 0 (e.g., 03001234567)'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  meterNumber: z.string().optional(), // Optional - will be auto-generated if not provided
  connectionType: z.enum(['Residential', 'Commercial', 'Industrial', 'Agricultural']).optional().default('Residential'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    console.log('[Registration API] Starting registration process...');
    
    const body = await request.json();
    console.log('[Registration API] Request body received:', { 
      email: body.email, 
      fullName: body.fullName,
      city: body.city,
      hasMeterNumber: !!body.meterNumber
    });

    // Validate request body
    const validationResult = registrationSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('[Registration API] Validation failed:', validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    console.log('[Registration API] Validation passed, processing registration...');

    // Check for existing user and phone in a single query to reduce race condition window
    console.log('[Registration API] Checking for existing user and phone...');
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser) {
      console.log('[Registration API] User already exists:', data.email);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const [existingPhone] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, data.phone))
      .limit(1);

    if (existingPhone) {
      console.log('[Registration API] Phone already exists:', data.phone);
      return NextResponse.json(
        { error: 'Phone number is already registered' },
        { status: 409 }
      );
    }

    // Handle meter number logic (auto-assign or validate existing)
    console.log('[Registration API] Processing meter number...');
    let finalMeterNumber: string;
    let customerStatus: 'active' | 'suspended' | 'inactive' = 'active';

    if (data.meterNumber && data.meterNumber.trim()) {
      console.log('[Registration API] User provided meter number:', data.meterNumber);
      // Existing customer flow - validate provided meter number
      if (!isValidMeterNumber(data.meterNumber)) {
        console.log('[Registration API] Invalid meter number format');
        return NextResponse.json(
          { error: 'Invalid meter number format. Must be MTR-XXX-XXXXXX (e.g., MTR-KHI-000001)' },
          { status: 400 }
        );
      }

      const isAvailable = await isMeterNumberAvailable(data.meterNumber);
      if (!isAvailable) {
        console.log('[Registration API] Meter number already in use');
        return NextResponse.json(
          { error: 'This meter number is already registered to another customer' },
          { status: 409 }
        );
      }

      finalMeterNumber = data.meterNumber;
      customerStatus = 'active'; // Existing meter = active connection
    } else {
      console.log('[Registration API] Auto-generating meter number for city:', data.city);
      // New customer flow - auto-generate meter number
      finalMeterNumber = await generateMeterNumber(data.city);
      customerStatus = 'active'; // New meter = active (database doesn't have pending_installation)
    }

    console.log('[Registration API] Final meter number:', finalMeterNumber);
    console.log('[Registration API] Customer status:', customerStatus);

    // Generate secure password hash
    console.log('[Registration API] Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Start transaction (if supported by your MySQL setup)
    let newUser: any = null;

    try {
      console.log('[Registration API] Creating user account...');
      // Create user account
      const [insertResult] = await db.insert(users).values({
        email: data.email,
        password: hashedPassword,
        userType: 'customer',
        name: data.fullName,
        phone: data.phone,
        isActive: 1,
      });

      // Get user ID from insert result
      const userId = (insertResult as any).insertId;
      console.log('[Registration API] User created with ID:', userId);

      // Get the newly created user
      [newUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      console.log('[Registration API] User retrieved:', newUser?.email);

      // Generate unique account number (not meter - use customer's meter)
      const timestamp = Date.now();
      const accountNumber = `ELX-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;

      // Assign zone based on city (simple zone assignment)
      const getZoneFromCity = (city: string): string => {
        const cityLower = city.toLowerCase();
        if (cityLower.includes('karachi')) return 'Zone A';
        if (cityLower.includes('lahore')) return 'Zone B';
        if (cityLower.includes('islamabad') || cityLower.includes('rawalpindi')) return 'Zone C';
        if (cityLower.includes('faisalabad') || cityLower.includes('multan')) return 'Zone D';
        return 'Zone A'; // Default zone
      };

      const assignedZone = getZoneFromCity(data.city);
      console.log('[Registration API] Assigned zone:', assignedZone, 'for city:', data.city);

      // Create customer record
      const customerData: any = {
        userId: newUser.id,
        accountNumber,
        meterNumber: finalMeterNumber, // Use auto-generated or validated meter number
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        zone: assignedZone, // Assign zone based on city
        connectionType: data.connectionType || 'Residential',
        status: customerStatus, // 'pending_installation' or 'active'
        connectionDate: new Date().toISOString().split('T')[0],
        lastBillAmount: '0.00',
        outstandingBalance: '0.00',
        averageMonthlyUsage: '0.00',
        paymentStatus: 'paid',
      };

      console.log('[Registration API] Creating customer record...');
      await db.insert(customers).values(customerData);
      console.log('[Registration API] Customer record created successfully');

      // Return success response with status information
      console.log('[Registration API] Registration completed successfully');
      return NextResponse.json({
        success: true,
        message: !data.meterNumber
          ? 'Registration successful! Your meter has been assigned. You can now login with your email and password.'
          : 'Registration successful! You can now login with your email and password.',
        data: {
          email: data.email,
          accountNumber,
          meterNumber: finalMeterNumber,
          fullName: data.fullName,
          status: customerStatus,
          isNewCustomer: !data.meterNumber,
          zone: assignedZone,
        },
      }, { status: 201 });

    } catch (dbError) {
      // If customer creation fails, try to clean up the user record
      console.error('[Registration API] Database error during registration:', dbError);

      // Attempt to delete the user if it was created
      if (newUser?.id) {
        try {
          console.log('[Registration API] Cleaning up user record...');
          await db.delete(users).where(eq(users.id, newUser.id));
          console.log('[Registration API] User record cleaned up');
        } catch (cleanupError) {
          console.error('[Registration API] Failed to cleanup user after registration failure:', cleanupError);
        }
      }

      throw dbError;
    }

  } catch (error: any) {
    console.error('[Registration API] Registration error:', error);

    if (error instanceof z.ZodError) {
      console.log('[Registration API] Zod validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    // Handle MySQL duplicate key errors (race condition protection)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      console.log('[Registration API] Duplicate key error detected');
      if (error.message?.includes('email')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      } else if (error.message?.includes('phone')) {
        return NextResponse.json(
          { error: 'Phone number is already registered' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'This email or phone number is already registered' },
        { status: 409 }
      );
    }

    console.log('[Registration API] Returning error response:', error?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Registration failed. Please try again later.', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if email is available
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return NextResponse.json({
      available: existingUser.length === 0,
      message: existingUser.length === 0
        ? 'Email is available'
        : 'Email is already registered',
    });

  } catch (error) {
    console.error('Email check error:', error);
    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    );
  }
}

