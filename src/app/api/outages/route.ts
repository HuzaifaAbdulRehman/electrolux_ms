import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { outages, customers, notifications } from '@/lib/drizzle/schema';
import { eq, desc, and, sql, like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let zone = searchParams.get('zone');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // If customer user, get their zone and filter automatically
    let customerZone = null;
    if (session.user.userType === 'customer') {
      const userId = parseInt(session.user.id);
      const [customer] = await db
        .select({ zone: customers.zone })
        .from(customers)
        .where(eq(customers.userId, userId));

      if (customer?.zone) {
        customerZone = customer.zone;
        zone = customer.zone; // Override zone parameter with customer's zone
      }
    }

    // Build where conditions
    const conditions = [];
    if (zone) conditions.push(eq(outages.zone, zone));
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
      customerZone: customerZone,
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
    console.error('[Outages API] Error fetching outages:', error);
    return NextResponse.json({
      error: 'Failed to fetch outages',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create outages
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      areaName,
      zone,
      outageType,
      reason,
      severity,
      scheduledStartTime,
      scheduledEndTime,
      affectedCustomerCount
    } = body;

    // Validate required fields
    if (!areaName || !zone || !outageType || !severity) {
      return NextResponse.json({
        error: 'Missing required fields: areaName, zone, outageType, severity'
      }, { status: 400 });
    }

    const userId = parseInt(session.user.id);
    
    // Calculate affected customer count if not provided or invalid
    let providedCount: number | null = null;
    if (typeof affectedCustomerCount !== 'undefined' && affectedCustomerCount !== null) {
      const parsed = Number(affectedCustomerCount);
      providedCount = Number.isFinite(parsed) ? parsed : null;
    }

    let customerCount = 0;
    if (providedCount === null || providedCount <= 0) {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(customers)
        .where(eq(customers.zone, zone));
      customerCount = countResult.count;
    } else {
      customerCount = providedCount;
    }

    const insertResult = await db.insert(outages).values({
      areaName,
      zone,
      outageType,
      reason,
      severity,
      scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : null,
      scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
      affectedCustomerCount: customerCount,
      status: 'scheduled',
      createdBy: userId
    });

    // Get the newly created outage to retrieve its ID
    const [newOutage] = await db.select().from(outages).orderBy(desc(outages.id)).limit(1);
    const outageId = newOutage?.id;

    // Send notifications to affected customers
    try {
      const affectedCustomers = await db
        .select({ userId: customers.userId, fullName: customers.fullName })
        .from(customers)
        .where(eq(customers.zone, zone));

      const notificationPromises = affectedCustomers.map(customer => 
        db.insert(notifications).values({
          userId: customer.userId,
          notificationType: 'outage',
          title: `Power Outage Scheduled - ${areaName}`,
          message: `A ${outageType} power outage is scheduled for ${areaName} on ${scheduledStartTime ? new Date(scheduledStartTime).toLocaleDateString() : 'TBD'}. ${reason ? `Reason: ${reason}` : ''}`,
          priority: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
          actionUrl: '/customer/outage-schedule',
          actionText: 'View Details',
          isRead: 0
        })
      );

      await Promise.all(notificationPromises);
      console.log(`[Outage API] Sent notifications to ${affectedCustomers.length} customers`);
    } catch (notificationError) {
      console.error('[Outage API] Error sending notifications:', notificationError);
      // Don't fail the outage creation if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Outage created successfully',
      data: { 
        id: outageId,
        affectedCustomers: customerCount,
        notificationsSent: true
      }
    });

  } catch (error: any) {
    console.error('[Outages API] Error creating outage:', error);
    return NextResponse.json({
      error: 'Failed to create outage',
      details: error.message
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin and employees can update outages
    if (!['admin', 'employee'].includes(session.user.userType)) {
      return NextResponse.json({ error: 'Forbidden - Admin/Employee access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

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

    // Convert datetime strings to Date objects if present
    if (updateData.scheduledStartTime) {
      updateData.scheduledStartTime = new Date(updateData.scheduledStartTime);
    }
    if (updateData.scheduledEndTime) {
      updateData.scheduledEndTime = new Date(updateData.scheduledEndTime);
    }
    if (updateData.actualStartTime) {
      updateData.actualStartTime = new Date(updateData.actualStartTime);
    }
    if (updateData.actualEndTime) {
      updateData.actualEndTime = new Date(updateData.actualEndTime);
    }

    // Handle status changes with timestamps
    const now = new Date();
    if (updateData.status) {
      if (updateData.status === 'ongoing' && currentOutage.status === 'scheduled') {
        updateData.actualStartTime = now;
      } else if (updateData.status === 'restored' && currentOutage.status === 'ongoing') {
        updateData.actualEndTime = now;
      }
    }

    await db.update(outages)
      .set(updateData)
      .where(eq(outages.id, id));

    // Send notifications for status changes
    if (updateData.status && updateData.status !== currentOutage.status) {
      try {
        const affectedCustomers = await db
          .select({ userId: customers.userId, fullName: customers.fullName })
          .from(customers)
          .where(eq(customers.zone, currentOutage.zone));

        let notificationTitle = '';
        let notificationMessage = '';
        let priority = 'medium';

        switch (updateData.status) {
          case 'ongoing':
            notificationTitle = `Power Outage Started - ${currentOutage.areaName}`;
            notificationMessage = `The scheduled power outage in ${currentOutage.areaName} has started. Expected restoration: ${currentOutage.scheduledEndTime ? new Date(currentOutage.scheduledEndTime).toLocaleString() : 'TBD'}`;
            priority = 'high';
            break;
          case 'restored':
            notificationTitle = `Power Restored - ${currentOutage.areaName}`;
            notificationMessage = `Power has been restored in ${currentOutage.areaName}. ${updateData.restorationNotes ? `Notes: ${updateData.restorationNotes}` : ''}`;
            priority = 'medium';
            break;
          case 'cancelled':
            notificationTitle = `Outage Cancelled - ${currentOutage.areaName}`;
            notificationMessage = `The scheduled power outage in ${currentOutage.areaName} has been cancelled.`;
            priority = 'low';
            break;
        }

        if (notificationTitle) {
          const notificationPromises = affectedCustomers.map(customer => 
            db.insert(notifications).values({
              userId: customer.userId,
              notificationType: 'outage',
              title: notificationTitle,
              message: notificationMessage,
              priority: priority as any, actionUrl: '/customer/outage-schedule',
              actionText: 'View Details',
              isRead: 0
            })
          );

          await Promise.all(notificationPromises);
          console.log(`[Outage API] Sent status update notifications to ${affectedCustomers.length} customers`);
        }
      } catch (notificationError) {
        console.error('[Outage API] Error sending status notifications:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Outage updated successfully',
      data: { 
        id,
        status: updateData.status,
        notificationsSent: updateData.status ? true : false
      }
    });

  } catch (error: any) {
    console.error('[Outages API] Error updating outage:', error);
    return NextResponse.json({
      error: 'Failed to update outage',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete outages
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Outage ID is required' }, { status: 400 });
    }

    await db.delete(outages).where(eq(outages.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: 'Outage deleted successfully'
    });

  } catch (error: any) {
    console.error('[Outages API] Error deleting outage:', error);
    return NextResponse.json({
      error: 'Failed to delete outage',
      details: error.message
    }, { status: 500 });
  }
}

