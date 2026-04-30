import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { readingRequests, customers, workOrders, employees } from '@/lib/drizzle/schema';
import { eq, and, desc, or, sql } from 'drizzle-orm';

// GET /api/reading-requests - Get reading requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId');
    const requestId = searchParams.get('id');

    let query = db
      .select({
        id: readingRequests.id,
        requestNumber: readingRequests.requestNumber,
        customerId: readingRequests.customerId,
        requestDate: readingRequests.requestDate,
        preferredDate: readingRequests.preferredDate,
        requestReason: readingRequests.requestReason,
        priority: readingRequests.priority,
        status: readingRequests.status,
        notes: readingRequests.notes,
        workOrderId: readingRequests.workOrderId,
        assignedDate: readingRequests.assignedDate,
        completedDate: readingRequests.completedDate,
        customerName: customers.fullName,
        customerAccount: customers.accountNumber,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        customerAddress: customers.address,
        customerCity: customers.city,
        meterNumber: customers.meterNumber,
        employeeName: employees.employeeName,
        employeeNumber: employees.employeeNumber,
      })
      .from(readingRequests)
      .leftJoin(customers, eq(readingRequests.customerId, customers.id))
      .leftJoin(workOrders, eq(readingRequests.workOrderId, workOrders.id))
      .leftJoin(employees, eq(workOrders.employeeId, employees.id))
      .$dynamic();

    const conditions = [];

    // Filter by specific request ID
    if (requestId) {
      conditions.push(eq(readingRequests.id, parseInt(requestId)));
    }

    // Filter based on user type
    if (session.user.userType === 'customer') {
      // Customers can only see their own requests
      conditions.push(eq(readingRequests.customerId, session.user.customerId!));
    } else if (session.user.userType === 'employee') {
      // Employees can see requests assigned to them via work orders
      conditions.push(
        or(
          eq(workOrders.employeeId, session.user.employeeId!),
          sql`${readingRequests.workOrderId} IS NULL` // Also show unassigned requests
        ) as any
      );
    }
    // Admin can see all requests

    // Filter by status
    if (status) {
      const statuses = status.split(',');
      if (statuses.length > 1) {
        const statusConditions = statuses.map(s => `'${s.trim()}'`).join(',');
        conditions.push(sql`${readingRequests.status} IN (${sql.raw(statusConditions)})` as any);
      } else {
        conditions.push(eq(readingRequests.status, status as any));
      }
    }

    // Filter by customer ID (for admin/employee)
    if (customerId && session.user.userType !== 'customer') {
      conditions.push(eq(readingRequests.customerId, parseInt(customerId)));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    // Sort by priority and request date
    const result = await query.orderBy(
      sql`CASE
        WHEN ${readingRequests.priority} = 'urgent' THEN 1
        WHEN ${readingRequests.priority} = 'normal' THEN 2
        ELSE 3
      END`,
      desc(readingRequests.requestDate)
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching reading requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reading requests' },
      { status: 500 }
    );
  }
}

// POST /api/reading-requests - Create new reading request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, preferredDate, requestReason, priority, notes } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customer = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (customer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Generate unique request number
    const requestNumber = `RR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create reading request
    const [newRequest] = await db.insert(readingRequests).values({
      requestNumber,
      customerId: parseInt(customerId),
      preferredDate: preferredDate || null,
      requestReason: requestReason || null,
      priority: priority || 'normal',
      status: 'pending',
      notes: notes || null,
    });

    // Fetch the created request with customer details
    const createdRequest = await db
      .select({
        id: readingRequests.id,
        requestNumber: readingRequests.requestNumber,
        customerId: readingRequests.customerId,
        requestDate: readingRequests.requestDate,
        preferredDate: readingRequests.preferredDate,
        requestReason: readingRequests.requestReason,
        priority: readingRequests.priority,
        status: readingRequests.status,
        notes: readingRequests.notes,
        customerName: customers.fullName,
        customerAccount: customers.accountNumber,
        customerPhone: customers.phone,
      })
      .from(readingRequests)
      .leftJoin(customers, eq(readingRequests.customerId, customers.id))
      .where(eq(readingRequests.id, newRequest.insertId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: createdRequest[0],
      message: 'Reading request submitted successfully',
    });
  } catch (error) {
    console.error('Error creating reading request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create reading request' },
      { status: 500 }
    );
  }
}

// PATCH /api/reading-requests - Update reading request (assign, complete, cancel)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update reading requests
    if (session.user.userType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can update reading requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, workOrderId, priority, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Check if request exists
    const existing = await db.select().from(readingRequests).where(eq(readingRequests.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reading request not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'assigned') {
        updateData.assignedDate = new Date();
      } else if (status === 'completed') {
        updateData.completedDate = new Date();
      }
    }

    if (workOrderId !== undefined) {
      updateData.workOrderId = workOrderId;
    }

    if (priority) {
      updateData.priority = priority;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update the request
    await db.update(readingRequests).set(updateData).where(eq(readingRequests.id, id));

    // Fetch updated request
    const updatedRequest = await db
      .select({
        id: readingRequests.id,
        requestNumber: readingRequests.requestNumber,
        customerId: readingRequests.customerId,
        requestDate: readingRequests.requestDate,
        preferredDate: readingRequests.preferredDate,
        requestReason: readingRequests.requestReason,
        priority: readingRequests.priority,
        status: readingRequests.status,
        notes: readingRequests.notes,
        workOrderId: readingRequests.workOrderId,
        assignedDate: readingRequests.assignedDate,
        completedDate: readingRequests.completedDate,
        customerName: customers.fullName,
        customerAccount: customers.accountNumber,
      })
      .from(readingRequests)
      .leftJoin(customers, eq(readingRequests.customerId, customers.id))
      .where(eq(readingRequests.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: updatedRequest[0],
      message: 'Reading request updated successfully',
    });
  } catch (error) {
    console.error('Error updating reading request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update reading request' },
      { status: 500 }
    );
  }
}
