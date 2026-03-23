import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { workOrders } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/work-orders/[id] - Update work order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Employees and admins can update work orders
    if (session.user.userType !== 'employee' && session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Only employees can update work orders' }, { status: 403 });
    }

    const workOrderId = parseInt(params.id);
    if (isNaN(workOrderId)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, completionNotes, employeeId } = body;

    // Validate status
    const validStatuses = ['assigned', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Build update object
    const updateData: any = {};
    if (status) updateData.status = status;
    if (completionNotes !== undefined) updateData.completionNotes = completionNotes;
    if (employeeId) updateData.employeeId = employeeId;
    if (status === 'completed') updateData.completionDate = new Date();
    if (status === 'in_progress' && !updateData.assignedDate) {
      updateData.assignedDate = new Date();
    }

    // If employee is starting work, assign to them
    if (session.user.userType === 'employee' && status === 'in_progress') {
      updateData.employeeId = session.user.employeeId;
    }

    // Update work order
    await db
      .update(workOrders)
      .set(updateData)
      .where(eq(workOrders.id, workOrderId));

    return NextResponse.json({
      success: true,
      message: 'Work order updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating work order:', error);
    return NextResponse.json({
      error: 'Failed to update work order',
      details: error.message
    }, { status: 500 });
  }
}

// GET /api/work-orders/[id] - Get specific work order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrderId = parseInt(params.id);
    if (isNaN(workOrderId)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
    }

    const [workOrder] = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, workOrderId))
      .limit(1);

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: workOrder
    });

  } catch (error: any) {
    console.error('Error fetching work order:', error);
    return NextResponse.json({
      error: 'Failed to fetch work order',
      details: error.message
    }, { status: 500 });
  }
}
