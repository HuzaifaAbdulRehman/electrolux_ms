import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, users, bills, payments, meterReadings } from '@/lib/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

// GET /api/customers/[id] - Get customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = parseInt(params.id, 10);

    // Customers can only view their own data
    if (session.user.userType === 'customer' && session.user.customerId !== customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get recent bills
    const recentBills = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        billingMonth: bills.billingMonth,
        totalAmount: bills.totalAmount,
        status: bills.status,
        dueDate: bills.dueDate,
      })
      .from(bills)
      .where(eq(bills.customerId, customerId))
      .orderBy(desc(bills.issueDate))
      .limit(5);

    // Get recent payments
    const recentPayments = await db
      .select({
        id: payments.id,
        paymentAmount: payments.paymentAmount,
        paymentMethod: payments.paymentMethod,
        paymentDate: payments.paymentDate,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.paymentDate))
      .limit(5);

    // Get recent meter readings
    const recentReadings = await db
      .select({
        id: meterReadings.id,
        currentReading: meterReadings.currentReading,
        previousReading: meterReadings.previousReading,
        unitsConsumed: meterReadings.unitsConsumed,
        readingDate: meterReadings.readingDate,
      })
      .from(meterReadings)
      .where(eq(meterReadings.customerId, customerId))
      .orderBy(desc(meterReadings.readingDate))
      .limit(6);

    // Get statistics
    const [stats] = await db
      .select({
        totalBills: sql<number>`count(distinct ${bills.id})`,
        totalPaid: sql<number>`sum(case when ${bills.status} = 'paid' then ${bills.totalAmount} else 0 end)`,
        totalOutstanding: sql<number>`sum(case when ${bills.status} != 'paid' then ${bills.totalAmount} else 0 end)`,
        avgMonthlyConsumption: sql<number>`avg(${meterReadings.unitsConsumed})`,
      })
      .from(bills)
      .leftJoin(meterReadings, eq(bills.customerId, meterReadings.customerId))
      .where(eq(bills.customerId, customerId));

    return NextResponse.json({
      success: true,
      data: {
        customer,
        recentBills,
        recentPayments,
        recentReadings,
        statistics: stats,
      },
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}

// PATCH /api/customers/[id] - Update customer (Admin/Customer own profile)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = parseInt(params.id, 10);

    // Customers can only update their own profile with limited fields
    if (session.user.userType === 'customer' && session.user.customerId !== customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = await request.json();

    console.log('[UPDATE CUSTOMER] Request from:', session.user.userType, 'for customer:', customerId);

    // Get existing customer data
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    // If customer is updating their own profile, limit the fields they can update
    if (session.user.userType === 'customer') {
      const allowedFields = ['phone', 'address', 'city', 'state', 'pincode'];
      const filteredBody: any = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          filteredBody[field] = body[field];
        }
      }
      body = filteredBody;
    }

    // Admin can update all fields
    const updateData: any = {
      updatedAt: new Date()
    };

    // Update allowed fields
    if (body.fullName) updateData.fullName = body.fullName;
    if (body.email) updateData.email = body.email;
    if (body.phone) updateData.phone = body.phone;
    if (body.address) updateData.address = body.address;
    if (body.city) updateData.city = body.city;
    if (body.state) updateData.state = body.state;
    if (body.pincode) updateData.pincode = body.pincode;
    if (body.zone) updateData.zone = body.zone;
    if (body.connectionType) updateData.connectionType = body.connectionType;
    if (body.status) updateData.status = body.status;

    // Meter number update (Admin only)
    if (body.meterNumber && session.user.userType === 'admin') {
      // Check if meter number already exists (must be unique)
      const [existingMeter] = await db
        .select()
        .from(customers)
        .where(eq(customers.meterNumber, body.meterNumber))
        .limit(1);

      if (existingMeter && existingMeter.id !== customerId) {
        return NextResponse.json({
          success: false,
          error: 'Meter number already exists'
        }, { status: 400 });
      }

      updateData.meterNumber = body.meterNumber;

      // If assigning meter for first time, set status to active
      if (!existingCustomer.meterNumber && body.meterNumber) {
        updateData.status = 'active';
        console.log('[UPDATE CUSTOMER] Meter assigned, setting status to active');
      }
    }

    // Update customer record
    await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, customerId));

    // If email or name changed, update user record too (Admin only)
    if (session.user.userType === 'admin' && (body.email || body.fullName)) {
      const userUpdateData: any = {
        updatedAt: new Date()
      };
      if (body.email) userUpdateData.email = body.email;
      if (body.fullName) userUpdateData.name = body.fullName;

      await db
        .update(users)
        .set(userUpdateData)
        .where(eq(users.id, existingCustomer.userId));

      console.log('[UPDATE CUSTOMER] User record also updated');
    }

    console.log('[UPDATE CUSTOMER] Customer updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully'
    });

  } catch (error: any) {
    console.error('[UPDATE CUSTOMER] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update customer',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - Soft delete customer (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete customers
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const customerId = parseInt(params.id, 10);

    console.log('[DELETE CUSTOMER] Soft deleting customer ID:', customerId);

    // Get customer data first
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    // SOFT DELETE: Set status to inactive instead of deleting
    // This preserves data integrity - bills, payments, meter readings remain intact
    await db
      .update(customers)
      .set({
        status: 'inactive',
        updatedAt: new Date()
      } as any)
      .where(eq(customers.id, customerId));

    // Also deactivate user account (can't login)
    await db
      .update(users)
      .set({
        isActive: 0,
        updatedAt: new Date()
      } as any)
      .where(eq(users.id, existingCustomer.userId));

    console.log('[DELETE CUSTOMER] Customer soft deleted (status: inactive, user account disabled)');

    return NextResponse.json({
      success: true,
      message: 'Customer deactivated successfully'
    });

  } catch (error: any) {
    console.error('[DELETE CUSTOMER] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete customer',
      details: error.message
    }, { status: 500 });
  }
}