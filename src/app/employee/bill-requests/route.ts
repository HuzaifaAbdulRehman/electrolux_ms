import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { billRequests, customers, meterReadings } from '@/lib/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// GET /api/employee/bill-requests - Get all pending bill requests for employees
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only employees and admins can access this endpoint
    if (session.user.userType !== 'employee' && session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Employee role required.' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build query with filters
    const conditions = [];
    if (status) {
      conditions.push(eq(billRequests.status, status as any));
    }
    if (priority) {
      conditions.push(eq(billRequests.priority, priority as any));
    }

    // Fetch bill requests with customer and meter reading details
    const requests = await db
      .select({
        id: billRequests.id,
        requestId: billRequests.requestId,
        customerId: billRequests.customerId,
        customerName: customers.fullName,
        accountNumber: customers.accountNumber,
        meterNumber: customers.meterNumber,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        customerCity: customers.city,
        connectionType: customers.connectionType,
        billingMonth: billRequests.billingMonth,
        priority: billRequests.priority,
        notes: billRequests.notes,
        status: billRequests.status,
        requestDate: billRequests.requestDate,
        createdAt: billRequests.createdAt,
        updatedAt: billRequests.updatedAt,
        // We'll fetch meter reading separately for each request
      })
      .from(billRequests)
      .leftJoin(customers, eq(billRequests.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) as any : undefined)
      .orderBy(
        desc(sql`CASE ${billRequests.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`),
        desc(billRequests.createdAt)
      )
      .limit(limit);

    // For each request, fetch the meter reading for the billing month
    const requestsWithReading = await Promise.all(
      requests.map(async (req) => {
        // Get meter reading for this billing month
        const reading = await db
          .select({
            id: meterReadings.id,
            currentReading: meterReadings.currentReading,
            previousReading: meterReadings.previousReading,
            unitsConsumed: meterReadings.unitsConsumed,
            readingDate: meterReadings.readingDate,
            meterCondition: meterReadings.meterCondition,
          })
          .from(meterReadings)
          .where(and(
            eq(meterReadings.customerId, req.customerId),
            sql`DATE_FORMAT(${meterReadings.readingDate}, '%Y-%m-01') = ${req.billingMonth}`
          ))
          .limit(1);

        return {
          ...req,
          meterReading: reading[0] || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: requestsWithReading,
      total: requestsWithReading.length,
    });

  } catch (error) {
    console.error('Error fetching bill requests:', error);
    return NextResponse.json({ error: 'Failed to fetch bill requests' }, { status: 500 });
  }
}

