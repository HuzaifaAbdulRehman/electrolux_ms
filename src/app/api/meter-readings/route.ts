import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { meterReadings, customers, employees, notifications } from '@/lib/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// GET /api/meter-readings - Get meter readings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const billingMonth = searchParams.get('billingMonth');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: meterReadings.id,
        customerName: customers.fullName,
        accountNumber: customers.accountNumber,
        meterNumber: meterReadings.meterNumber,
        currentReading: meterReadings.currentReading,
        previousReading: meterReadings.previousReading,
        unitsConsumed: meterReadings.unitsConsumed,
        readingDate: meterReadings.readingDate,
        meterCondition: meterReadings.meterCondition,
        employeeName: employees.employeeName,
      })
      .from(meterReadings)
      .leftJoin(customers, eq(meterReadings.customerId, customers.id))
      .leftJoin(employees, eq(meterReadings.employeeId, employees.id))
      .$dynamic();

    const conditions = [];

    // Filter based on user type
    if (session.user.userType === 'customer') {
      conditions.push(eq(meterReadings.customerId, session.user.customerId!));
    } else if (customerId) {
      conditions.push(eq(meterReadings.customerId, parseInt(customerId, 10)));
    }

    // Filter by billing month if provided
    if (billingMonth) {
      const monthStart = new Date(billingMonth);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      console.log(`[Meter Readings GET] Filtering by billing month: ${monthStartStr} to ${monthEndStr}`);

      conditions.push(
        sql`${meterReadings.readingDate} >= ${monthStartStr} AND ${meterReadings.readingDate} < ${monthEndStr}`
      );
    }

    // Apply conditions with AND logic
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] as any : and(...conditions) as any);
    }

    query = query.orderBy(desc(meterReadings.readingDate)).limit(limit).offset(offset);
    const result = await query;

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(meterReadings).$dynamic();
    if (conditions.length > 0) {
      countQuery = countQuery.where(conditions.length === 1 ? conditions[0] as any : and(...conditions) as any);
    }
    const [{ count }] = await countQuery;

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching meter readings:', error);
    return NextResponse.json({ error: 'Failed to fetch meter readings' }, { status: 500 });
  }
}

// POST /api/meter-readings - Record new meter reading
export async function POST(request: NextRequest) {
  console.log('=== [Meter Readings POST] Route hit ===');
  try {
    const session = await getServerSession(authOptions);
    console.log('[Meter Readings POST] Session:', session ? 'exists' : 'null');
    if (!session) {
      console.error('[Meter Readings POST] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Meter Readings POST] Request from:', session.user.userType, 'employeeId:', session.user.employeeId);

    // Only employees can record meter readings
    if (session.user.userType !== 'employee') {
      console.error('[Meter Readings POST] User is not an employee');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure employeeId exists in session (might be missing if logged in before reseed)
    if (!session.user.employeeId) {
      console.error('[Meter Readings POST] Employee ID not found in session. Please log out and log back in.');
      return NextResponse.json({
        error: 'Session expired. Please log out and log back in.',
        details: 'Employee ID not found in session'
      }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, currentReading, meterCondition, accessibility, notes } = body;

    console.log('[Meter Readings POST] Request data:', { customerId, currentReading, meterCondition, accessibility });

    // Map accessibility values to valid enum values
    const validAccessibility = ['accessible', 'partially_accessible', 'inaccessible'];
    let mappedAccessibility = accessibility;
    if (!validAccessibility.includes(accessibility)) {
      // Map common values
      if (accessibility === 'easy' || accessibility === 'good') {
        mappedAccessibility = 'accessible';
      } else if (accessibility === 'moderate' || accessibility === 'partial') {
        mappedAccessibility = 'partially_accessible';
      } else if (accessibility === 'difficult' || accessibility === 'hard' || accessibility === 'none') {
        mappedAccessibility = 'inaccessible';
      } else {
        mappedAccessibility = 'accessible'; // default
      }
      console.log(`[Meter Readings POST] Mapped accessibility '${accessibility}' to '${mappedAccessibility}'`);
    }

    if (!customerId || !currentReading) {
      console.error('[Meter Readings POST] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get previous reading
    const [previousReading] = await db
      .select()
      .from(meterReadings)
      .where(eq(meterReadings.customerId, customerId))
      .orderBy(desc(meterReadings.readingDate))
      .limit(1);

    const previousReadingValue = previousReading ? parseFloat(previousReading.currentReading) : 0;
    const currentReadingValue = parseFloat(currentReading);

    // Professional validation: Allow any reading value
    // Lower readings are normal for: meter replacement, rollover, seasonal usage, meter repair
    if (currentReadingValue < 0) {
      return NextResponse.json({
        error: 'Reading cannot be negative'
      }, { status: 400 });
    }
    
    // Log warning for lower readings (not blocking)
    if (currentReadingValue < previousReadingValue) {
      console.log(`⚠️  WARNING: Customer ${customerId} - Current reading (${currentReadingValue}) is less than previous reading (${previousReadingValue})`);
      console.log(`This is normal for: meter replacement, rollover, seasonal usage, or meter repair`);
    }

    // Calculate units consumed (can be negative for meter replacement/rollover)
    const unitsConsumed = currentReadingValue - previousReadingValue;
    
    // Log the calculation for transparency
    console.log(`📊 Units consumed calculation: ${currentReadingValue} - ${previousReadingValue} = ${unitsConsumed} kWh`);

    // Create meter reading
    console.log('[Meter Readings POST] Inserting reading:', {
      customerId,
      meterNumber: customer.meterNumber,
      currentReading: currentReadingValue.toString(),
      previousReading: previousReadingValue.toString(),
      unitsConsumed: unitsConsumed.toString(),
    });

    // Insert meter reading
    const readingInsert = await db.insert(meterReadings).values({
      customerId,
      meterNumber: customer.meterNumber,
      currentReading: currentReadingValue.toString(),
      previousReading: previousReadingValue.toString(),
      unitsConsumed: unitsConsumed.toString(),
      readingDate: new Date().toISOString().split('T')[0],
      readingTime: new Date(),
      meterCondition: meterCondition || 'good',
      accessibility: mappedAccessibility || 'accessible',
      employeeId: session.user.employeeId,
      notes,
    } as any);

    const readingId = (readingInsert as any).insertId;
    console.log('[Meter Readings POST] Reading inserted with ID:', readingId);

    // Update customer's average monthly usage
    try {
      const avgUsage = await db
        .select({ avg: sql<number>`AVG(CAST(${meterReadings.unitsConsumed} AS DECIMAL(10,2)))` })
        .from(meterReadings)
        .where(eq(meterReadings.customerId, customerId));

      if (avgUsage[0]?.avg != null) {
        await db
          .update(customers)
          .set({
            averageMonthlyUsage: Number(avgUsage[0].avg).toFixed(2),
          })
          .where(eq(customers.id, customerId));
      }
    } catch (avgError) {
      console.error('[Meter Readings POST] Error updating average usage:', avgError);
      // Don't fail the whole request for this
    }

    // Create notification for customer about completed meter reading
    if (customer.userId) {
      try {
        await db.insert(notifications).values({
          userId: customer.userId,
          notificationType: 'work_order',
          title: 'Meter Reading Completed',
          message: `Your meter reading has been completed successfully. Units consumed: ${unitsConsumed} kWh. Your bill will be generated shortly.`,
          priority: 'normal',
          actionUrl: '/customer/view-bills',
          actionText: 'View Bills',
          isRead: 0,
        } as any);
      } catch (notifError) {
        console.error('[Meter Readings POST] Error creating notification:', notifError);
        // Don't fail the whole request for notification error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Meter reading recorded successfully',
      data: {
        readingId,
        unitsConsumed,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Meter Readings POST] Error recording meter reading:', error);
    console.error('[Meter Readings POST] Error stack:', error.stack);
    return NextResponse.json({
      error: 'Failed to record meter reading',
      details: error.message
    }, { status: 500 });
  }
}

