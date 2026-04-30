import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { employees, users, workOrders } from '@/lib/drizzle/schema';
import { eq, sql, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow employees to access this endpoint
    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[Employee Profile API] Fetching profile for employee:', session.user.id);

    // Get employee details using the numeric userId
    const userId = parseInt(session.user.id);
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId));

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get work statistics
    const [workStats] = await db
      .select({
        totalTasks: sql<number>`COUNT(*)`,
        completedTasks: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'completed' THEN 1 ELSE 0 END)`,
        inProgressTasks: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'in_progress' THEN 1 ELSE 0 END)`,
        pendingTasks: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'assigned' THEN 1 ELSE 0 END)`,
      })
      .from(workOrders)
      .where(eq(workOrders.employeeId, employee.id));

    // Get current month's completed tasks
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyStats] = await db
      .select({
        completedThisMonth: sql<number>`COUNT(*)`
      })
      .from(workOrders)
      .where(and(
        eq(workOrders.employeeId, employee.id),
        eq(workOrders.status, 'completed'),
        sql`${workOrders.completionDate} >= ${startOfMonth.toISOString().split('T')[0]}`
      ));

    // Get recent work orders
    const recentWorkOrders = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.employeeId, employee.id))
      .orderBy(desc(workOrders.createdAt))
      .limit(10);

    // Calculate experience (years and months from hire date)
    const hireDate = new Date(employee.hireDate);
    const now = new Date();
    const years = now.getFullYear() - hireDate.getFullYear();
    const months = now.getMonth() - hireDate.getMonth();
    const totalMonths = years * 12 + months;
    const experienceYears = Math.floor(totalMonths / 12);
    const experienceMonths = totalMonths % 12;
    const experience = `${experienceYears} years ${experienceMonths} months`;

    // Calculate performance metrics
    const totalTasks = workStats?.totalTasks || 0;
    const completedTasks = workStats?.completedTasks || 0;
    const successRate = totalTasks > 0
      ? ((completedTasks / totalTasks) * 100).toFixed(1)
      : '0';

    const avgDaily = monthlyStats?.completedThisMonth
      ? (monthlyStats.completedThisMonth / new Date().getDate()).toFixed(1)
      : '0';

    const profileData = {
      employeeId: `EMP-${employee.id.toString().padStart(4, '0')}`,
      fullName: employee.employeeName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      assignedZone: employee.assignedZone || 'Not Assigned',
      status: employee.status,
      hireDate: employee.hireDate,
      experience: experience,
      workStats: {
        totalTasks: totalTasks,
        completedThisMonth: monthlyStats?.completedThisMonth || 0,
        avgDaily: parseFloat(avgDaily),
        successRate: successRate,
        inProgressTasks: workStats?.inProgressTasks || 0,
        pendingTasks: workStats?.pendingTasks || 0
      },
      recentWorkOrders: recentWorkOrders
    };

    return NextResponse.json({
      success: true,
      data: profileData,
      message: 'Employee profile fetched successfully'
    });

  } catch (error: any) {
    console.error('[Employee Profile API] Error fetching profile:', error);
    return NextResponse.json({
      error: 'Failed to fetch employee profile',
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

    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = parseInt(session.user.id);
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId));

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { phone, email } = body;

    // Update allowed fields
    const updateData: any = {};
    if (phone) updateData.phone = phone;

    if (Object.keys(updateData).length > 0) {
      await db.update(employees)
        .set(updateData)
        .where(eq(employees.id, employee.id));

      // If email is provided, also update users table
      if (email) {
        await db.update(users)
          .set({ email: email })
          .where(eq(users.id, userId));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('[Employee Profile API] Error updating profile:', error);
    return NextResponse.json({
      error: 'Failed to update profile',
      details: error.message
    }, { status: 500 });
  }
}

