import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, users } from '@/lib/drizzle/schema';
import { eq, like, or, desc, asc, and, sql } from 'drizzle-orm';

// GET /api/customers - Get all customers (Admin/Employee only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and employees can view all customers
    if (session.user.userType !== 'admin' && session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering and pagination
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId') || searchParams.get('id');
    const countOnly = searchParams.get('countOnly');
    const zone = searchParams.get('zone');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const connectionType = searchParams.get('connectionType') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // If customerId is provided, fetch that specific customer
    if (customerId) {
      const customer = await db
        .select({
          id: customers.id,
          accountNumber: customers.accountNumber,
          meterNumber: customers.meterNumber,
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
          lastBillAmount: customers.lastBillAmount,
          lastPaymentDate: customers.lastPaymentDate,
          averageMonthlyUsage: customers.averageMonthlyUsage,
          outstandingBalance: customers.outstandingBalance,
          paymentStatus: customers.paymentStatus,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .where(eq(customers.id, parseInt(customerId, 10)))
        .limit(1);

      return NextResponse.json({
        success: true,
        data: customer,
      });
    }

    // Fast path: countOnly with optional zone filter
    if (countOnly === 'true') {
      const conditions: any[] = [];
      if (zone) conditions.push(eq(customers.zone, zone));

      let countQuery = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(customers)
        .$dynamic();

      if (conditions.length > 0) {
        countQuery = countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
      }

      const [result] = await countQuery as any;

      return NextResponse.json({ success: true, data: { count: Number(result.count) } });
    }

    // Build query
    let query = db
      .select({
        id: customers.id,
        accountNumber: customers.accountNumber,
        meterNumber: customers.meterNumber,
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
        lastBillAmount: customers.lastBillAmount,
        lastPaymentDate: customers.lastPaymentDate,
        averageMonthlyUsage: customers.averageMonthlyUsage,
        outstandingBalance: customers.outstandingBalance,
        paymentStatus: customers.paymentStatus,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .$dynamic();

    // Apply filters
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(customers.fullName, `%${search}%`),
          like(customers.email, `%${search}%`),
          like(customers.accountNumber, `%${search}%`),
          like(customers.meterNumber, `%${search}%`),
          like(customers.phone, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(customers.status, status as any));
    }

    if (connectionType) {
      conditions.push(eq(customers.connectionType, connectionType as any));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    // Apply sorting
    const orderByColumn = {
      'createdAt': customers.createdAt,
      'fullName': customers.fullName,
      'accountNumber': customers.accountNumber,
      'connectionType': customers.connectionType,
      'status': customers.status,
      'outstandingBalance': customers.outstandingBalance,
    }[sortBy] || customers.createdAt;

    query = query.orderBy(
      sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)
    );

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const result = await query;

    // Get total count for pagination
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(customers)
      .$dynamic();

    if (conditions.length > 0) {
      countQuery = countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    const [{ count }] = await countQuery as any;

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create new customer (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create customers
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Support both old field names (direct admin entry) and new field names (from new form)
    // Map new field names to database field names
    const applicantName = body.applicantName || body.fullName;
    const propertyAddress = body.propertyAddress || body.address;
    const propertyType = body.propertyType || body.connectionType;

    // Validate required fields (zone and installation charges required for consistency)
    if (!applicantName || !body.email || !body.phone || !propertyAddress ||
        !body.city || !body.state || !body.pincode || !propertyType || !body.zone || !body.installationCharges) {
      return NextResponse.json(
        { error: 'Missing required fields. Zone and installation charges are required.' },
        { status: 400 }
      );
    }

    // Validate installation charges is a valid positive number
    const installationCharges = parseFloat(body.installationCharges);
    if (isNaN(installationCharges) || installationCharges < 0) {
      return NextResponse.json(
        { error: 'Installation charges must be a valid positive number' },
        { status: 400 }
      );
    }

    // Generate a cryptographically secure password
    const crypto = await import('crypto');
    const randomPassword = crypto.randomBytes(8).toString('base64').replace(/[/+=]/g, '') +
                          crypto.randomBytes(4).toString('hex').toUpperCase() + '!@#';
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    const [newUser] = await db.insert(users).values({
      email: body.email,
      password: hashedPassword,
      userType: 'customer',
      name: applicantName,
      phone: body.phone,
      isActive: 1,
    });

    console.log('[CREATE CUSTOMER] User created with ID:', newUser.insertId);

    // Generate account number (unique timestamp-based)
    // Format: ELX-YYYY-XXXXXX-RRR (Year-Timestamp-Random)
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const accountNumber = `ELX-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}-${randomSuffix}`;

    // Path policy:
    // - Admin-created (offline): fully detailed, meter auto-generated, status active
    // - Online self-registration (separate route): minimal fields, status pending_installation until meter install

    const customerStatus = 'active';

    // Temporarily set meter; will finalize after we know the new customer ID
    let meterNumber = 'TEMP';

    console.log('[CREATE CUSTOMER - ADMIN DIRECT] Account number:', accountNumber);
    console.log('[CREATE CUSTOMER - ADMIN DIRECT] Meter will be auto-generated');
    console.log('[CREATE CUSTOMER - ADMIN DIRECT] Status: active (offline customer registration)');

    // Create customer record (offline, complete details)
    // Note: Additional fields like fatherName, idType, idNumber, etc. are not stored in customers table
    // They are only stored in connectionRequests table for online applications
    const [newCustomer] = await db.insert(customers).values({
      userId: newUser.insertId,
      accountNumber,
      meterNumber: meterNumber,
      fullName: applicantName,
      email: body.email,
      phone: body.phone,
      address: propertyAddress,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      zone: body.zone,
      connectionType: propertyType,
      status: customerStatus,
      connectionDate: body.connectionDate || new Date().toISOString().split('T')[0],
      installationCharges: installationCharges,
    } as any);

    const customerId = newCustomer.insertId;
    console.log('[CREATE CUSTOMER] Customer created with ID:', customerId);

    // If meter number was set to TEMP, update with actual customer ID
    if (meterNumber === 'TEMP') {
      // Meter number format: MTR-{CustomerID}-{Year}
      const actualMeterNumber = `MTR-${String(customerId).padStart(6, '0')}-${new Date().getFullYear()}`;

      await db.update(customers)
        .set({ meterNumber: actualMeterNumber } as any)
        .where(eq(customers.id, customerId));

      meterNumber = actualMeterNumber;
      console.log('[CREATE CUSTOMER] Meter number updated to:', actualMeterNumber);
    }

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully with meter assigned',
      data: {
        id: customerId,
        accountNumber,
        meterNumber,
        status: customerStatus,
        temporaryPassword: randomPassword, // Admin should provide this to customer
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

