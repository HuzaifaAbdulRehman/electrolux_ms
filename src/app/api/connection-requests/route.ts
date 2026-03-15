import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { connectionRequests, customers, users, notifications } from '@/lib/drizzle/schema';
import { eq, and, or, desc } from 'drizzle-orm';

// POST - Create new connection application (public - no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      applicantName,
      fatherName,
      email,
      phone,
      alternatePhone,
      idType,
      idNumber,
      propertyType,
      connectionType,
      loadRequired,
      propertyAddress,
      city,
      state,
      pincode,
      landmark,
      preferredDate,
      purposeOfConnection,
      existingConnection,
      existingAccountNumber,
      zone
    } = body;

    console.log('[Connection Request] New application received from:', applicantName, email, 'Zone:', zone);

    // Validation
    if (!applicantName || !email || !phone || !idType || !idNumber || !propertyType || !connectionType || !propertyAddress || !city || !purposeOfConnection || !zone) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'Please fill all required fields including zone'
      }, { status: 400 });
    }

    // DBMS: Check if email already belongs to an existing customer (one person = one meter rule)
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (existingCustomer) {
      return NextResponse.json({
        error: 'Email already registered',
        details: `This email is already registered. If you have an account, please login. If you forgot your password, use the forgot password option. One person can only have one meter connection.`
      }, { status: 400 });
    }

    // DBMS: Check if phone already belongs to an existing customer (prevent duplicate accounts)
    const [existingCustomerByPhone] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1);

    if (existingCustomerByPhone) {
      return NextResponse.json({
        error: 'Phone number already registered',
        details: `This phone number is already registered with another account. One person can only have one meter connection.`
      }, { status: 400 });
    }

    // DBMS: Check if email already has a pending/approved application
    const [existingRequest] = await db
      .select()
      .from(connectionRequests)
      .where(and(
        eq(connectionRequests.email, email),
        or(
          eq(connectionRequests.status, 'pending'),
          eq(connectionRequests.status, 'under_review'),
          eq(connectionRequests.status, 'approved')
        )
      ))
      .limit(1);

    if (existingRequest) {
      return NextResponse.json({
        error: 'Application already exists',
        details: `You already have a ${existingRequest.status} application with number ${existingRequest.applicationNumber}. Please wait for admin review.`
      }, { status: 400 });
    }

    // DBMS: Check if phone already has a pending/approved application
    const [existingRequestByPhone] = await db
      .select()
      .from(connectionRequests)
      .where(and(
        eq(connectionRequests.phone, phone),
        or(
          eq(connectionRequests.status, 'pending'),
          eq(connectionRequests.status, 'under_review'),
          eq(connectionRequests.status, 'approved')
        )
      ))
      .limit(1);

    if (existingRequestByPhone) {
      return NextResponse.json({
        error: 'Phone number already has pending application',
        details: `This phone number already has a ${existingRequestByPhone.status} application with number ${existingRequestByPhone.applicationNumber}.`
      }, { status: 400 });
    }

    // Generate application number: APP-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const applicationNumber = `APP-${year}-${randomNum}`;

    // Create connection request
    const [newRequest] = await db.insert(connectionRequests).values({
      applicationNumber,
      applicantName,
      fatherName: fatherName || null,
      email,
      phone,
      alternatePhone: alternatePhone || null,
      idType,
      idNumber,
      propertyType,
      connectionType,
      loadRequired: loadRequired || null,
      propertyAddress,
      city,
      state: state || null,
      pincode: pincode || null,
      landmark: landmark || null,
      preferredDate: preferredDate || null,
      purposeOfConnection,
      existingConnection: existingConnection || false,
      existingAccountNumber: existingAccountNumber || null,
      zone: zone || null,
      status: 'pending',
      applicationDate: new Date().toISOString().split('T')[0],
    } as any);

    console.log('[Connection Request] Application created successfully:', applicationNumber, 'with Zone:', zone);

    // Notify admins about new connection request
    try {
      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.userType, 'admin' as any));

      await Promise.all(adminUsers.map((admin) => db.insert(notifications).values({
        userId: admin.id,
        notificationType: 'service',
        title: 'New Connection Request',
        message: `Application ${applicationNumber} submitted by ${applicantName}`,
        priority: 'normal',
        actionUrl: '/admin/connection-requests',
        actionText: 'Review',
        isRead: 0
      } as any)));
    } catch (e) {
      console.error('[Connection Request] Failed to send admin notifications:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationNumber,
        applicantName,
        email,
        status: 'pending',
        applicationDate: new Date().toISOString().split('T')[0]
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Connection Request] Error creating application:', error);
    return NextResponse.json({
      error: 'Failed to submit application',
      details: error.message
    }, { status: 500 });
  }
}

// Lightweight GET for verification: fetch by applicationNumber or email (no auth)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationNumber = searchParams.get('applicationNumber');
    const email = searchParams.get('email');

    if (!applicationNumber && !email) {
      return NextResponse.json({
        error: 'Provide applicationNumber or email to query',
      }, { status: 400 });
    }

    const whereConds: any[] = [];
    if (applicationNumber) whereConds.push(eq(connectionRequests.applicationNumber, applicationNumber));
    if (email) whereConds.push(eq(connectionRequests.email, email));

    const results = await db
      .select()
      .from(connectionRequests)
      .where(whereConds.length === 1 ? whereConds[0] : and(...whereConds))
      .orderBy(desc(connectionRequests.createdAt))
      .limit(20);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('[Connection Request] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests', details: error.message }, { status: 500 });
  }
}

