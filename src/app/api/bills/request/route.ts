import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, billRequests } from '@/lib/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billingMonth, priority, notes } = body;

    // Validate inputs
    if (!billingMonth) {
      return NextResponse.json(
        { error: 'Billing month is required' },
        { status: 400 }
      );
    }

    // Get customer ID from authenticated session
    let customerId: number;

    if (session.user.userType === 'customer') {
      // For customers, get their customer record
      const customerRecord = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.userId, parseInt(session.user.id)))
        .limit(1);

      if (!customerRecord.length) {
        return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
      }

      customerId = customerRecord[0].id;
    } else if (session.user.userType === 'admin' || session.user.userType === 'employee') {
      // For admin/employee, customer ID should be provided in request
      if (!body.customerId) {
        return NextResponse.json({ error: 'Customer ID is required for admin/employee requests' }, { status: 400 });
      }
      customerId = body.customerId;
    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 403 });
    }

    // Generate request ID
    const requestId = `BREQ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Insert bill request using Drizzle ORM
    // Use INSERT ... ON DUPLICATE KEY UPDATE for unique constraint handling
    try {
      await db.insert(billRequests).values({
        requestId,
        customerId,
        billingMonth: new Date(billingMonth),
        priority: (priority as 'low' | 'medium' | 'high') || 'medium',
        notes: notes || null,
        status: 'pending',
        requestDate: new Date(),
        createdBy: parseInt(session.user.id),
      });
    } catch (error: any) {
      // If duplicate entry error, update existing record
      if (error.message?.includes('Duplicate entry')) {
        await db.update(billRequests)
          .set({
            priority: (priority as 'low' | 'medium' | 'high') || 'medium',
            notes: notes || null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(billRequests.customerId, customerId),
            eq(billRequests.billingMonth, billingMonth)
          ));
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bill request submitted successfully',
      requestId: requestId,
      customerId: customerId,
      estimatedTime: priority === 'high' ? '12 hours' : '24 hours'
    });

  } catch (error: any) {
    console.error('Bill request error:', error);

    // Handle specific error cases
    if (error.message?.includes('Duplicate entry')) {
      return NextResponse.json(
        { error: 'You have already requested a bill for this month' },
        { status: 400 }
      );
    }

    if (error.message?.includes('bill_requests')) {
      return NextResponse.json(
        { error: 'Bill request feature is not available. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit bill request. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch customer's bill requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let customerId: number;

    if (session.user.userType === 'customer') {
      // For customers, get their customer record
      const customerRecord = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.userId, parseInt(session.user.id)))
        .limit(1);

      if (!customerRecord.length) {
        return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
      }

      customerId = customerRecord[0].id;
    } else if (session.user.userType === 'admin' || session.user.userType === 'employee') {
      // For admin/employee, optionally filter by customer ID from query params
      const searchParams = request.nextUrl.searchParams;
      const customerIdParam = searchParams.get('customerId');

      if (customerIdParam) {
        customerId = parseInt(customerIdParam);
        if (isNaN(customerId)) {
          return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
        }
      } else {
        // Return all requests for admin/employee
        const requests = await db
          .select({
            id: billRequests.id,
            requestId: billRequests.requestId,
            customerId: billRequests.customerId,
            billingMonth: billRequests.billingMonth,
            priority: billRequests.priority,
            notes: billRequests.notes,
            status: billRequests.status,
            requestDate: billRequests.requestDate,
            createdAt: billRequests.createdAt,
            updatedAt: billRequests.updatedAt,
            customerName: customers.fullName,
            accountNumber: customers.accountNumber,
          })
          .from(billRequests)
          .leftJoin(customers, eq(billRequests.customerId, customers.id))
          .orderBy(desc(billRequests.createdAt))
          .limit(100);

        return NextResponse.json({
          success: true,
          requests: requests || []
        });
      }
    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 403 });
    }

    // Fetch requests for specific customer
    const requests = await db
      .select({
        id: billRequests.id,
        requestId: billRequests.requestId,
        billingMonth: billRequests.billingMonth,
        priority: billRequests.priority,
        notes: billRequests.notes,
        status: billRequests.status,
        requestDate: billRequests.requestDate,
        createdAt: billRequests.createdAt,
        updatedAt: billRequests.updatedAt,
      })
      .from(billRequests)
      .where(eq(billRequests.customerId, customerId))
      .orderBy(desc(billRequests.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      customerId: customerId,
      requests: requests || []
    });

  } catch (error: any) {
    console.error('Fetch requests error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch bill requests' },
      { status: 500 }
    );
  }
}

