import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { complaints, workOrders, notifications, customers, employees } from '@/lib/drizzle/schema';
import { eq, and, desc, sql, asc } from 'drizzle-orm';

// GET /api/complaints - Get complaints (filtered by user type)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: complaints.id,
        customerId: complaints.customerId,
        employeeId: complaints.employeeId,
        workOrderId: complaints.workOrderId,
        category: complaints.category,
        title: complaints.title,
        description: complaints.description,
        status: complaints.status,
        priority: complaints.priority,
        resolutionNotes: complaints.resolutionNotes,
        submittedAt: complaints.submittedAt,
        reviewedAt: complaints.reviewedAt,
        assignedAt: complaints.assignedAt,
        resolvedAt: complaints.resolvedAt,
        closedAt: complaints.closedAt,
        createdAt: complaints.createdAt,
        updatedAt: complaints.updatedAt,
      })
      .from(complaints)
      .$dynamic();

    const conditions = [];

    // Filter by user type
    if (session.user.userType === 'customer') {
      // Get customer ID from customers table
      const customer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.userId, parseInt(session.user.id, 10)))
        .limit(1);

      if (customer.length) {
        conditions.push(eq(complaints.customerId, customer[0].id));
      } else {
        // Return empty result if customer profile not found
        console.error(`Customer profile not found for userId: ${session.user.id}`);
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    } else if (session.user.userType === 'employee') {
      // Get employee ID from employees table
      const employee = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, parseInt(session.user.id, 10)))
        .limit(1);

      if (employee.length) {
        conditions.push(eq(complaints.employeeId, employee[0].id));
      } else {
        // Return empty result if employee profile not found
        console.error(`Employee profile not found for userId: ${session.user.id}`);
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }
    // Admin can see all complaints

    if (status) {
      conditions.push(eq(complaints.status, status as any));
    }

    if (category) {
      conditions.push(eq(complaints.category, category as any));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    // PROFESSIONAL SORTING: Priority first (urgent → low), then FIFO within same priority
    query = query.orderBy(
      sql`CASE
        WHEN ${complaints.priority} = 'urgent' THEN 1
        WHEN ${complaints.priority} = 'high' THEN 2
        WHEN ${complaints.priority} = 'medium' THEN 3
        WHEN ${complaints.priority} = 'low' THEN 4
        ELSE 5
      END`,
      asc(complaints.createdAt) // Oldest first within same priority (FIFO)
    ).limit(limit).offset(offset);

    const result = await query;

    // Get total count
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(complaints)
      .$dynamic();

    if (conditions.length > 0) {
      countQuery = countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    const [{ count }] = await countQuery as any;

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    return NextResponse.json({
      error: 'Failed to fetch complaints',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/complaints - Create new complaint (Customer only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Only customers can submit complaints' }, { status: 403 });
    }

    const body = await request.json();
    const { category, title, description } = body;

    if (!category || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get customer ID from customers table
    const customer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.userId, parseInt(session.user.id, 10)))
      .limit(1);

    if (!customer.length) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    // SET DEFAULT PRIORITY (Admin will review and adjust as needed)
    const finalPriority = 'medium';  // All complaints start as MEDIUM

    console.log(`📋 Complaint submitted with default priority: ${finalPriority} (Admin can adjust)`);

    // Create complaint
    const [newComplaint] = await db.insert(complaints).values({
      customerId: customer[0].id,
      category,
      title,
      description,
      priority: finalPriority,  // Priority set by category, NOT by customer!
      status: 'submitted',
    } as any);

    console.log('Complaint created with ID:', newComplaint.insertId);

    // Send notification to admin (try-catch to prevent failure)
    try {
      await db.insert(notifications).values({
        userId: 1, // Admin user ID (assuming admin is user 1)
        notificationType: 'service',
        title: 'New Complaint Submitted',
        message: `New ${finalPriority.toUpperCase()} priority complaint: ${title}`,
        priority: 'normal' as any,
        actionUrl: '/admin/complaints',
        isRead: 0,
      } as any);
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the complaint creation if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        id: newComplaint.insertId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating complaint:', error);
    return NextResponse.json({ 
      error: 'Failed to create complaint', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

