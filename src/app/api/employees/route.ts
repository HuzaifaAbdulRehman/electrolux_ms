import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { employees, users, workOrders, meterReadings } from '@/lib/drizzle/schema';
import { eq, like, or, desc, sql, and } from 'drizzle-orm';

// GET /api/employees - Get all employees (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can view all employees
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';

    let query = db
      .select({
        id: employees.id,
        employeeName: employees.employeeName,
        email: employees.email,
        phone: employees.phone,
        designation: employees.designation,
        department: employees.department,
        assignedZone: employees.assignedZone,
        status: employees.status,
        hireDate: employees.hireDate,
        workOrdersCount: sql<number>`(SELECT COUNT(*) FROM work_orders WHERE employee_id = employees.id)`,
        readingsCount: sql<number>`(SELECT COUNT(*) FROM meter_readings WHERE employee_id = employees.id)`,
      })
      .from(employees)
      .$dynamic();

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(employees.employeeName, `%${search}%`),
          like(employees.email, `%${search}%`),
          like(employees.designation, `%${search}%`)
        )
      );
    }

    if (department) {
      conditions.push(eq(employees.department, department));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    const result = await query.orderBy(desc(employees.createdAt));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

// POST /api/employees - Create new employee (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { employeeName, email, phone, designation, department, assignedZone } = body;

    if (!employeeName || !email || !phone || !designation || !department) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure email is not already registered
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Generate a cryptographically secure password for employee
    const crypto = await import('crypto');
    const randomPassword = crypto.randomBytes(8).toString('base64').replace(/[/+=]/g, '') +
                          crypto.randomBytes(4).toString('hex').toUpperCase() + '!@#';
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    let newUser;
    try {
      [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        userType: 'employee',
        name: employeeName,
        phone,
        isActive: 1,
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('Duplicate') || msg.includes('ER_DUP_ENTRY')) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      throw e;
    }

    // Create employee record
    const [newEmployee] = await db.insert(employees).values({
      userId: newUser.insertId,
      employeeName,
      email,
      phone,
      designation,
      department,
      assignedZone,
      status: 'active',
      hireDate: new Date().toISOString().split('T')[0],
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employeeId: newEmployee.insertId,
        email,
        name: employeeName,
        temporaryPassword: randomPassword,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

