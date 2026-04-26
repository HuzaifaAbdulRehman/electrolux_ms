import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { workOrders, customers, employees } from '@/lib/drizzle/schema';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // 1. COMPLAINT STATISTICS
    const [totalComplaints] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          gte(workOrders.createdAt, startDate)
        )
      );

    const [resolvedComplaints] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          eq(workOrders.status, 'completed'),
          gte(workOrders.createdAt, startDate)
        )
      );

    const [pendingComplaints] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          sql`${workOrders.status} IN ('assigned', 'in_progress')`,
          gte(workOrders.createdAt, startDate)
        )
      );

    // 2. COMPLAINTS BY CATEGORY (extracted from description)
    const complaintsByCategory = await db
      .select({
        category: sql<string>`CASE 
          WHEN ${workOrders.description} LIKE '%billing%' OR ${workOrders.description} LIKE '%bill%' THEN 'Billing'
          WHEN ${workOrders.description} LIKE '%service%' OR ${workOrders.description} LIKE '%power%' THEN 'Service'
          WHEN ${workOrders.description} LIKE '%technical%' OR ${workOrders.description} LIKE '%meter%' THEN 'Technical'
          WHEN ${workOrders.description} LIKE '%payment%' OR ${workOrders.description} LIKE '%pay%' THEN 'Payment'
          WHEN ${workOrders.description} LIKE '%outage%' OR ${workOrders.description} LIKE '%blackout%' THEN 'Outage'
          ELSE 'Other'
        END`.as('category'),
        count: sql<number>`COUNT(*)`
      })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          gte(workOrders.createdAt, startDate)
        )
      )
      .groupBy(sql`CASE 
        WHEN ${workOrders.description} LIKE '%billing%' OR ${workOrders.description} LIKE '%bill%' THEN 'Billing'
        WHEN ${workOrders.description} LIKE '%service%' OR ${workOrders.description} LIKE '%power%' THEN 'Service'
        WHEN ${workOrders.description} LIKE '%technical%' OR ${workOrders.description} LIKE '%meter%' THEN 'Technical'
        WHEN ${workOrders.description} LIKE '%payment%' OR ${workOrders.description} LIKE '%pay%' THEN 'Payment'
        WHEN ${workOrders.description} LIKE '%outage%' OR ${workOrders.description} LIKE '%blackout%' THEN 'Outage'
        ELSE 'Other'
      END`);

    // 3. COMPLAINTS BY PRIORITY
    const complaintsByPriority = await db
      .select({
        priority: workOrders.priority,
        count: sql<number>`COUNT(*)`
      })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          gte(workOrders.createdAt, startDate)
        )
      )
      .groupBy(workOrders.priority);

    // 4. RESOLUTION TIME ANALYSIS
    const resolutionTimes = await db
      .select({
        avgHours: sql<number>`AVG(TIMESTAMPDIFF(HOUR, ${workOrders.createdAt}, ${workOrders.completionDate}))`
      })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          eq(workOrders.status, 'completed'),
          gte(workOrders.createdAt, startDate)
        )
      );

    // 5. EMPLOYEE PERFORMANCE (complaints resolved)
    const employeePerformance = await db
      .select({
        employeeName: employees.employeeName,
        resolvedCount: sql<number>`COUNT(*)`,
        avgResolutionTime: sql<number>`AVG(TIMESTAMPDIFF(HOUR, ${workOrders.createdAt}, ${workOrders.completionDate}))`
      })
      .from(workOrders)
      .innerJoin(employees, eq(workOrders.employeeId, employees.id))
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          eq(workOrders.status, 'completed'),
          gte(workOrders.createdAt, startDate)
        )
      )
      .groupBy(employees.id, employees.employeeName)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // 6. COMPLAINTS TREND (daily)
    const complaintsTrend = await db
      .select({
        date: sql<string>`DATE(${workOrders.createdAt})`,
        count: sql<number>`COUNT(*)`
      })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          gte(workOrders.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${workOrders.createdAt})`)
      .orderBy(sql`DATE(${workOrders.createdAt})`);

    // 7. OVERDUE COMPLAINTS
    const [overdueComplaints] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.workType, 'complaint_resolution'),
          sql`${workOrders.status} IN ('assigned', 'in_progress')`,
          sql`${workOrders.dueDate} < CURDATE()`
        )
      );

    const analytics = {
      summary: {
        total: totalComplaints.count,
        resolved: resolvedComplaints.count,
        pending: pendingComplaints.count,
        overdue: overdueComplaints.count,
        resolutionRate: totalComplaints.count > 0 ? Math.round((resolvedComplaints.count / totalComplaints.count) * 100) : 0,
        avgResolutionTime: resolutionTimes[0]?.avgHours ? Math.round(resolutionTimes[0].avgHours) : 0
      },
      byCategory: complaintsByCategory,
      byPriority: complaintsByPriority,
      employeePerformance: employeePerformance,
      trend: complaintsTrend,
      period: parseInt(period)
    };

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching complaint analytics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch complaint analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

