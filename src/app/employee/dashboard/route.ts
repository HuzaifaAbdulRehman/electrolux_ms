import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { workOrders, meterReadings, customers } from '@/lib/drizzle/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only employees can access this endpoint
    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden - Employee access required' }, { status: 403 });
    }

    console.log('[Employee Dashboard API] Fetching dashboard data for employee:', session.user.id);

    const employeeId = session.user.employeeId;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID not found' }, { status: 404 });
    }

    // Get today's date for filtering
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // 1. COUNT ASSIGNED WORK ORDERS
    const [assignedOrdersCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.employeeId, employeeId),
          sql`${workOrders.status} IN ('assigned', 'in_progress')`
        )
      );

    // 2. COUNT COMPLETED WORK ORDERS TODAY
    const [completedTodayCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.employeeId, employeeId),
          eq(workOrders.status, 'completed'),
          sql`${workOrders.completionDate} >= ${todayStart}`,
          sql`${workOrders.completionDate} < ${todayEnd}`
        )
      );

    // 3. COUNT METER READINGS TODAY
    const [readingsTodayCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(meterReadings)
      .where(
        and(
          eq(meterReadings.employeeId, employeeId),
          sql`${meterReadings.readingDate} >= ${todayStart}`,
          sql`${meterReadings.readingDate} < ${todayEnd}`
        )
      );

    // 4. GET RECENT WORK ORDERS WITH CUSTOMER INFO
    const recentWorkOrders = await db
      .select({
        id: workOrders.id,
        title: workOrders.title,
        description: workOrders.description,
        workType: workOrders.workType,
        status: workOrders.status,
        priority: workOrders.priority,
        dueDate: workOrders.dueDate,
        customerName: customers.fullName,
        customerId: customers.id,
        accountNumber: customers.accountNumber
      })
      .from(workOrders)
      .leftJoin(customers, eq(workOrders.customerId, customers.id))
      .where(eq(workOrders.employeeId, employeeId))
      .orderBy(desc(workOrders.createdAt))
      .limit(10);

    const metrics = {
      assignedOrders: assignedOrdersCount.count || 0,
      completedOrders: completedTodayCount.count || 0,
      readingsToday: readingsTodayCount.count || 0
    };

    const dashboardData = {
      metrics,
      recentWorkOrders
    };

    console.log('[Employee Dashboard API] Dashboard data fetched successfully');
    console.log('[Employee Dashboard API] Metrics:', metrics);

    return NextResponse.json({
      success: true,
      data: dashboardData,
      message: 'Employee dashboard data fetched successfully'
    });

  } catch (error: any) {
    console.error('[Employee Dashboard API] Error fetching dashboard data:', error);
    return NextResponse.json({
      error: 'Failed to fetch employee dashboard data',
      details: error.message
    }, { status: 500 });
  }
}

