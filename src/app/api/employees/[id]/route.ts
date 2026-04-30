import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { employees, users } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/employees/[id] - Update employee (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update employees
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const employeeId = parseInt(params.id);
    const body = await request.json();

    console.log('[UPDATE EMPLOYEE] Updating employee ID:', employeeId);

    // Get current employee data
    const [existingEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!existingEmployee) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Update allowed fields
    if (body.employeeName) updateData.employeeName = body.employeeName;
    if (body.email) updateData.email = body.email;
    if (body.phone) updateData.phone = body.phone;
    if (body.designation) updateData.designation = body.designation;
    if (body.department) updateData.department = body.department;
    if (body.assignedZone) updateData.assignedZone = body.assignedZone;
    if (body.status) updateData.status = body.status;

    // Update employee record
    await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, employeeId));

    // If email or name changed, update user record too
    if (body.email || body.employeeName) {
      const userUpdateData: any = {
        updatedAt: new Date()
      };
      if (body.email) userUpdateData.email = body.email;
      if (body.employeeName) userUpdateData.name = body.employeeName;

      await db
        .update(users)
        .set(userUpdateData)
        .where(eq(users.id, existingEmployee.userId));

      console.log('[UPDATE EMPLOYEE] User record also updated');
    }

    // Fetch updated employee
    const [updatedEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    console.log('[UPDATE EMPLOYEE] Employee updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });

  } catch (error: any) {
    console.error('[UPDATE EMPLOYEE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update employee',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE /api/employees/[id] - Soft delete employee (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete employees
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const employeeId = parseInt(params.id);

    console.log('[DELETE EMPLOYEE] Soft deleting employee ID:', employeeId);

    // Get employee data first
    const [existingEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!existingEmployee) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }

    // SOFT DELETE: Set status to inactive instead of deleting
    // This preserves data integrity - work orders, assigned tasks remain intact
    await db
      .update(employees)
      .set({
        status: 'inactive',
        updatedAt: new Date()
      } as any)
      .where(eq(employees.id, employeeId));

    // Also deactivate user account (can't login)
    await db
      .update(users)
      .set({
        isActive: 0,
        updatedAt: new Date()
      } as any)
      .where(eq(users.id, existingEmployee.userId));

    console.log('[DELETE EMPLOYEE] Employee soft deleted (status: inactive, user account disabled)');

    return NextResponse.json({
      success: true,
      message: 'Employee deactivated successfully'
    });

  } catch (error: any) {
    console.error('[DELETE EMPLOYEE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete employee',
      details: error.message
    }, { status: 500 });
  }
}
