import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { readingRequests, workOrders, employees, customers, notifications } from '@/lib/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

// POST /api/reading-requests/assign - Assign reading request to employee (creates work order)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can assign requests
    if (session.user.userType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can assign reading requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, employeeId, dueDate, priority, notes } = body;

    console.log('[API] Assign request received:', { requestId, employeeId, dueDate, priority });

    // Validate required fields
    if (!requestId || !employeeId) {
      console.error('[API] Missing required fields:', { requestId, employeeId });
      return NextResponse.json(
        { success: false, error: 'Request ID and Employee ID are required' },
        { status: 400 }
      );
    }

    // Check if request exists and is pending
    const [readingRequest] = await db
      .select()
      .from(readingRequests)
      .where(eq(readingRequests.id, requestId))
      .limit(1);

    if (!readingRequest) {
      console.error('[API] Reading request not found:', requestId);
      return NextResponse.json(
        { success: false, error: 'Reading request not found' },
        { status: 404 }
      );
    }

    console.log('[API] Reading request found:', readingRequest);

    if (readingRequest.status !== 'pending') {
      console.error('[API] Request already processed:', readingRequest.status);
      return NextResponse.json(
        { success: false, error: 'Request has already been assigned or completed' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!employee) {
      console.error('[API] Employee not found:', employeeId);
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    console.log('[API] Employee found:', employee.employeeName);

    // Get customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, readingRequest.customerId))
      .limit(1);

    if (!customer) {
      console.error('[API] Customer not found:', readingRequest.customerId);
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('[API] Customer found:', customer.fullName);

    // Create work order with properly formatted MySQL dates
    // Format dates as YYYY-MM-DD strings for MySQL
    const formatMySQLDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const assignedDateValue = new Date();
    const assignedDateStr = formatMySQLDate(assignedDateValue);

    const dueDateObj = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dueDateStr = formatMySQLDate(dueDateObj);

    // Map reading request priority to work order priority
    // reading_requests: 'normal' | 'urgent'
    // work_orders: 'low' | 'medium' | 'high' | 'urgent'
    // Since frontend no longer sends priority, we only use readingRequest.priority
    const workOrderPriority: 'low' | 'medium' | 'high' | 'urgent' =
      readingRequest.priority === 'urgent' ? 'urgent' : 'medium';

    console.log('[API] Creating work order with dates:', {
      assignedDate: assignedDateStr,
      dueDate: dueDateStr,
      priority: workOrderPriority,
      readingRequestPriority: readingRequest.priority
    });

    const workOrderData = {
      employeeId: parseInt(employeeId),
      customerId: readingRequest.customerId,
      workType: 'meter_reading' as const,
      title: `Meter Reading Request - ${customer.fullName}`,
      description: readingRequest.requestReason || `Customer requested meter reading${readingRequest.preferredDate ? ` (preferred date: ${readingRequest.preferredDate})` : ''}`,
      status: 'assigned' as const,
      priority: workOrderPriority,
      assignedDate: sql`${assignedDateStr}`,
      dueDate: sql`${dueDateStr}`,
    };

    console.log('[API] Work order data to insert:', workOrderData);

    const [newWorkOrder] = await db.insert(workOrders).values(workOrderData);

    // Update reading request with work order ID and status
    await db.update(readingRequests).set({
      status: 'assigned',
      workOrderId: newWorkOrder.insertId,
      assignedDate: new Date(),
      notes: notes || readingRequest.notes,
    }).where(eq(readingRequests.id, requestId));

    // Create notification for employee
    const notificationPriority = readingRequest.priority === 'urgent' ? 'high' : 'normal';

    await db.insert(notifications).values({
      userId: employee.userId,
      notificationType: 'work_order',
      title: 'New Meter Reading Assignment',
      message: `You have been assigned a meter reading request for ${customer.fullName} (Account: ${customer.accountNumber})`,
      priority: notificationPriority,
      isRead: 0,
    });

    // Fetch the updated request with all details
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
        customerName: customers.fullName,
        customerAccount: customers.accountNumber,
        employeeName: employees.employeeName,
        employeeNumber: employees.employeeNumber,
      })
      .from(readingRequests)
      .leftJoin(customers, eq(readingRequests.customerId, customers.id))
      .leftJoin(workOrders, eq(readingRequests.workOrderId, workOrders.id))
      .leftJoin(employees, eq(workOrders.employeeId, employees.id))
      .where(eq(readingRequests.id, requestId))
      .limit(1);

    console.log('[API] Assignment successful! Work Order ID:', newWorkOrder.insertId);

    return NextResponse.json({
      success: true,
      data: updatedRequest[0],
      workOrderId: newWorkOrder.insertId,
      message: `Reading request assigned to ${employee.employeeName} successfully`,
    });
  } catch (error: any) {
    console.error('[API] Error assigning reading request:', error);
    console.error('[API] Error details:', error.message, error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to assign reading request' },
      { status: 500 }
    );
  }
}
