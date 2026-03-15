import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, bills, meterReadings, billRequests } from '@/lib/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

// GET /api/bills/can-request - Check if customer can request bill for current month
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer ID
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.userId, parseInt(session.user.id)))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customer.id;
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';

    console.log('[API can-request] Customer ID:', customerId);
    console.log('[API can-request] Current month:', currentMonth);

    // Check 1: Does bill already exist for current month? (use DATE comparison for timezone)
    const [existingBill] = await db
      .select()
      .from(bills)
      .where(and(
        eq(bills.customerId, customerId),
        sql`DATE(${bills.billingMonth}) = ${currentMonth}` // ✅ Compare DATE only
      ))
      .limit(1);

    console.log('[API can-request] Existing bill found:', !!existingBill);
    if (existingBill) {
      console.log('[API can-request] Existing bill details:', {
        id: existingBill.id,
        billingMonth: existingBill.billingMonth
      });
    }

    // SIMPLIFIED LOGIC: Customer can request reading UNLESS bill exists
    if (existingBill) {
      console.log('[API can-request] Returning: canRequestReading = false (bill exists)');
      return NextResponse.json({
        canRequest: false,
        canRequestReading: false, // Cannot request reading if bill exists
        reason: 'Bill already exists for this month'
      });
    }

    // Check if there's already a pending work order for meter reading
    const { workOrders } = await import('@/lib/drizzle/schema');
    const [pendingWorkOrder] = await db
      .select()
      .from(workOrders)
      .where(and(
        eq(workOrders.customerId, customerId),
        eq(workOrders.workType, 'meter_reading'),
        sql`${workOrders.status} IN ('assigned', 'in_progress')`
      ))
      .limit(1);

    console.log('[API can-request] Pending work order found:', !!pendingWorkOrder);

    if (pendingWorkOrder) {
      console.log('[API can-request] Returning: canRequestReading = false (pending work order)');
      return NextResponse.json({
        canRequest: false,
        canRequestReading: false, // Already has pending request
        reason: 'You already have a pending meter reading request'
      });
    }

    // Customer can request meter reading (no bill exists, no pending request)
    console.log('[API can-request] Returning: canRequestReading = true (eligible)');
    return NextResponse.json({
      canRequest: false, // Not requesting bill directly
      canRequestReading: true, // CAN request meter reading
      reason: null
    });

  } catch (error: any) {
    console.error('Error checking bill request eligibility:', error);
    return NextResponse.json({
      error: 'Failed to check eligibility',
      details: error.message
    }, { status: 500 });
  }
}

