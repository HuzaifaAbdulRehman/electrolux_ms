import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { complaints, workOrders, notifications, employees, customers } from '@/lib/drizzle/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/complaints/[id] - Get single complaint
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const complaint = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, parseInt(params.id)))
      .limit(1);

    if (!complaint.length) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Check permissions
    const complaintData = complaint[0];
    if (session.user.userType === 'customer') {
      const customer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.userId, parseInt(session.user.id)))
        .limit(1);

      if (!customer.length || complaintData.customerId !== customer[0].id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (session.user.userType === 'employee') {
      const employee = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, parseInt(session.user.id)))
        .limit(1);

      if (!employee.length || complaintData.employeeId !== employee[0].id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: complaint[0],
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    return NextResponse.json({ error: 'Failed to fetch complaint' }, { status: 500 });
  }
}

// PATCH /api/complaints/[id] - Update complaint status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, resolutionNotes, employeeId, priority } = body;

    console.log('Complaint update request:', { complaintId: params.id, status, employeeId, priority, resolutionNotes });

    const complaint = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, parseInt(params.id)))
      .limit(1);

    if (!complaint.length) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const complaintData = complaint[0];

    // Authorization check - must be admin or assigned employee
    if (session.user.userType === 'customer') {
      return NextResponse.json({
        error: 'Forbidden - Customers cannot update complaints'
      }, { status: 403 });
    }

    if (session.user.userType === 'employee') {
      // Get employee ID from user ID
      const employee = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, parseInt(session.user.id)))
        .limit(1);

      // Employee can only update if assigned to this complaint
      if (!employee.length || complaintData.employeeId !== employee[0].id) {
        return NextResponse.json({
          error: 'Forbidden - You can only update complaints assigned to you'
        }, { status: 403 });
      }
    }

    // Admin can update any complaint (no additional check needed)

    let updateData: any = {};

    // Handle status update
    if (status) {
      updateData.status = status;

      // Handle different status transitions with timestamps
      const now = new Date();

      if (status === 'under_review') {
        if (!complaintData.reviewedAt) {
          updateData.reviewedAt = now;
        }
      } else if (status === 'assigned') {
        if (!complaintData.assignedAt) {
          updateData.assignedAt = now;
        }
      } else if (status === 'in_progress') {
        if (!complaintData.assignedAt) {
          updateData.assignedAt = now;
        }
      } else if (status === 'resolved') {
        if (!complaintData.resolvedAt) {
          updateData.resolvedAt = now;
        }
      } else if (status === 'closed') {
        if (!complaintData.closedAt) {
          updateData.closedAt = now;
        }
      }
    }

    // Handle priority change FIRST (ADMIN ONLY) - must be before work order creation!
    let finalPriority = complaintData.priority; // Default to existing priority

    if (priority !== undefined) {
      // Only admin can change priority
      if (session.user.userType !== 'admin') {
        return NextResponse.json({
          error: 'Only admins can change complaint priority'
        }, { status: 403 });
      }

      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({
          error: 'Invalid priority',
          details: 'Priority must be: low, medium, high, or urgent'
        }, { status: 400 });
      }

      updateData.priority = priority;
      finalPriority = priority; // Use new priority for work order
      console.log(`🎯 Admin changed priority: ${complaintData.priority} → ${priority}`);
    }

    // Handle employee assignment (with validation)
    if (employeeId !== undefined) {
      const empId = parseInt(employeeId);

      if (isNaN(empId)) {
        return NextResponse.json({
          error: 'Invalid employee ID',
          details: `Received: ${employeeId}`
        }, { status: 400 });
      }

      // Validate that employee exists
      const employee = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, empId))
        .limit(1);

      if (!employee.length) {
        return NextResponse.json({
          error: 'Employee not found',
          details: `Employee ID ${empId} does not exist`
        }, { status: 404 });
      }

      updateData.employeeId = empId;

      // Auto-set assigned timestamp if not already set
      if (!complaintData.assignedAt && !updateData.assignedAt) {
        updateData.assignedAt = new Date();
      }

      // AUTO-CREATE WORK ORDER when complaint is assigned to employee
      try {
        // Calculate due date based on FINAL priority (admin-set or existing)
        const now = new Date();
        let daysToAdd = 7; // Default: 7 days

        switch (finalPriority) {  // ← Use finalPriority (admin-set!)
          case 'urgent':
            daysToAdd = 1; // 1 day for urgent
            break;
          case 'high':
            daysToAdd = 2; // 2 days for high
            break;
          case 'medium':
            daysToAdd = 5; // 5 days for medium
            break;
          case 'low':
            daysToAdd = 7; // 7 days for low
            break;
        }

        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + daysToAdd);

        // Format dates as YYYY-MM-DD for MySQL date columns
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // Create work order with FINAL priority
        const [newWorkOrder] = await db.insert(workOrders).values({
          employeeId: empId,
          customerId: complaintData.customerId,
          workType: 'complaint_resolution',
          title: complaintData.title,
          description: complaintData.description,
          status: 'assigned',
          priority: finalPriority,  // ← Use finalPriority (admin-set!)
          assignedDate: formatDate(now),
          dueDate: formatDate(dueDate),
        } as any);

        // Link work order to complaint
        updateData.workOrderId = newWorkOrder.insertId;

        console.log(`✅ Work order ${newWorkOrder.insertId} created with priority: ${finalPriority} (${daysToAdd} days)`);
      } catch (workOrderError) {
        console.error('Failed to create work order:', workOrderError);
        // Don't fail complaint assignment if work order creation fails
      }
    }

    // Handle resolution notes
    if (resolutionNotes !== undefined) {
      updateData.resolutionNotes = resolutionNotes;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: 'No valid fields to update',
        details: 'Please provide at least one field to update'
      }, { status: 400 });
    }

    console.log('Updating complaint with data:', updateData);
    
    await db
      .update(complaints)
      .set(updateData)
      .where(eq(complaints.id, parseInt(params.id)));

    console.log('Complaint updated successfully');

    // SYNC WORK ORDER STATUS when complaint status changes
    if (status && complaintData.workOrderId) {
      try {
        let workOrderStatus = null;
        let workOrderUpdate: any = {};

        // Map complaint status to work order status
        switch (status) {
          case 'assigned':
            workOrderStatus = 'assigned';
            break;
          case 'in_progress':
            workOrderStatus = 'in_progress';
            break;
          case 'resolved':
          case 'closed':
            workOrderStatus = 'completed';
            workOrderUpdate.completionDate = new Date().toISOString().split('T')[0];
            if (resolutionNotes) {
              workOrderUpdate.completionNotes = resolutionNotes;
            }
            break;
        }

        if (workOrderStatus) {
          workOrderUpdate.status = workOrderStatus;

          await db
            .update(workOrders)
            .set(workOrderUpdate)
            .where(eq(workOrders.id, complaintData.workOrderId));

          console.log(`Work order ${complaintData.workOrderId} status synced to: ${workOrderStatus}`);
        }
      } catch (workOrderSyncError) {
        console.error('Failed to sync work order status:', workOrderSyncError);
        // Don't fail complaint update if work order sync fails
      }
    }

    // Send notifications based on status change or assignment
    try {
      // Notify employee when assigned
      if (employeeId !== undefined) {
        const empId = parseInt(employeeId);
        if (!isNaN(empId)) {
          const employee = await db
            .select({ userId: employees.userId })
            .from(employees)
            .where(eq(employees.id, empId))
            .limit(1);

          if (employee.length) {
            await db.insert(notifications).values({
              userId: employee[0].userId,
              notificationType: 'work_order',
              title: 'New Complaint Assigned',
              message: `You have been assigned to complaint: ${complaintData.title}`,
              priority: complaintData.priority === 'urgent' ? 'high' : 'normal',
              actionUrl: '/employee/work-orders',
              isRead: 0,
            } as any);
          }
        }
      }

      // Notify customer when complaint is resolved or closed
      if (status && ['resolved', 'closed'].includes(status)) {
        const customer = await db
          .select({ userId: customers.userId })
          .from(customers)
          .where(eq(customers.id, complaintData.customerId))
          .limit(1);

        if (customer.length) {
          await db.insert(notifications).values({
            userId: customer[0].userId,
            notificationType: 'service',
            title: `Complaint ${status === 'resolved' ? 'Resolved' : 'Closed'}`,
            message: `Your complaint "${complaintData.title}" has been ${status}.`,
            priority: 'normal',
            actionUrl: '/customer/complaints',
            isRead: 0,
          } as any);
        }
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the complaint update if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Complaint updated successfully',
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: 'Failed to update complaint', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
