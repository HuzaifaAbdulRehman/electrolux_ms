import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { outages, customers, notifications, users } from '@/lib/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

// GET /api/employee/outages - Get outages assigned to employee or in their area
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Unauthorized - Employee access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (status) conditions.push(eq(outages.status, status as any));
    if (type) conditions.push(eq(outages.outageType, type as any));

    // Get outages with pagination
    const outagesList = await db
      .select()
      .from(outages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(outages.scheduledStartTime))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(outages)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: outagesList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('[Employee Outages API] Error fetching outages:', error);
    return NextResponse.json({
      error: 'Failed to fetch outages',
      details: error.message
    }, { status: 500 });
  }
}

// PATCH /api/employee/outages - Update outage status (for field employees)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Unauthorized - Employee access required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, restorationNotes, actualStartTime, actualEndTime } = body;

    if (!id) {
      return NextResponse.json({ error: 'Outage ID is required' }, { status: 400 });
    }

    // Get current outage details
    const [currentOutage] = await db
      .select()
      .from(outages)
      .where(eq(outages.id, id));

    if (!currentOutage) {
      return NextResponse.json({ error: 'Outage not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (restorationNotes) updateData.restorationNotes = restorationNotes;
    if (actualStartTime) updateData.actualStartTime = new Date(actualStartTime);
    if (actualEndTime) updateData.actualEndTime = new Date(actualEndTime);

    // Handle status changes with automatic timestamps
    const now = new Date();
    if (status) {
      if (status === 'ongoing' && currentOutage.status === 'scheduled') {
        updateData.actualStartTime = now;
      } else if (status === 'restored' && currentOutage.status === 'ongoing') {
        updateData.actualEndTime = now;
      }
    }

    await db
      .update(outages)
      .set(updateData)
      .where(eq(outages.id, id));

    // Send notifications for status changes
    if (status && status !== currentOutage.status) {
      try {
        // Get affected customers in the zone
        const affectedCustomers = await db
          .select({ userId: customers.userId, fullName: customers.fullName })
          .from(customers)
          .where(eq(customers.zone, currentOutage.zone));

        // Get all admin users
        const adminUsers = await db
          .select({ userId: users.id, name: users.name })
          .from(users)
          .where(eq(users.userType, 'admin'));

        let customerNotificationTitle = '';
        let customerNotificationMessage = '';
        let adminNotificationTitle = '';
        let adminNotificationMessage = '';
        let priority = 'medium';

        const employeeName = session.user.name || session.user.email;

        switch (status) {
          case 'ongoing':
            customerNotificationTitle = `Power Outage Started - ${currentOutage.areaName}`;
            customerNotificationMessage = `The scheduled power outage in ${currentOutage.areaName} has started. Expected restoration: ${currentOutage.scheduledEndTime ? new Date(currentOutage.scheduledEndTime).toLocaleString() : 'TBD'}`;
            adminNotificationTitle = `Employee Started Outage - ${currentOutage.areaName}`;
            adminNotificationMessage = `${employeeName} marked outage in ${currentOutage.areaName} (${currentOutage.zone}) as ongoing. Affected customers: ${currentOutage.affectedCustomerCount || 0}`;
            priority = 'high';
            break;
          case 'restored':
            customerNotificationTitle = `Power Restored - ${currentOutage.areaName}`;
            customerNotificationMessage = `Power has been restored in ${currentOutage.areaName}. ${restorationNotes ? `Notes: ${restorationNotes}` : ''}`;
            adminNotificationTitle = `Employee Resolved Outage - ${currentOutage.areaName}`;
            adminNotificationMessage = `${employeeName} restored power in ${currentOutage.areaName} (${currentOutage.zone}). ${restorationNotes ? `Notes: ${restorationNotes}` : 'No additional notes.'}`;
            priority = 'medium';
            break;
        }

        if (customerNotificationTitle) {
          // Send notifications to affected customers
          const customerNotificationPromises = affectedCustomers.map(customer =>
            db.insert(notifications).values({
              userId: customer.userId,
              notificationType: 'outage',
              title: customerNotificationTitle,
              message: customerNotificationMessage,
              priority: priority as any, actionUrl: '/customer/outage-schedule',
              actionText: 'View Details',
              isRead: 0
            })
          );

          // Send notifications to all admin users
          const adminNotificationPromises = adminUsers.map(admin =>
            db.insert(notifications).values({
              userId: admin.userId,
              notificationType: 'outage',
              title: adminNotificationTitle,
              message: adminNotificationMessage,
              priority: 'high', // Always high priority for admin notifications
              actionUrl: '/admin/outages',
              actionText: 'View Outages',
              isRead: 0
            })
          );

          await Promise.all([...customerNotificationPromises, ...adminNotificationPromises]);
          console.log(`[Employee Outage API] Sent status update notifications to ${affectedCustomers.length} customers and ${adminUsers.length} admins`);
        }
      } catch (notificationError) {
        console.error('[Employee Outage API] Error sending status notifications:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Outage status updated successfully',
      data: { 
        id,
        status,
        notificationsSent: status ? true : false
      }
    });

  } catch (error: any) {
    console.error('[Employee Outages API] Error updating outage:', error);
    return NextResponse.json({
      error: 'Failed to update outage',
      details: error.message
    }, { status: 500 });
  }
}

