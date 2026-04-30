import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { bills, customers, meterReadings, tariffs, tariffSlabs, notifications } from '@/lib/drizzle/schema';
import { eq, and, desc, gte, lte, or, like, sql, asc, inArray } from 'drizzle-orm';

// GET /api/bills - Get bills (filtered by user type)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const billId = searchParams.get('id');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const search = searchParams.get('search');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter by bill ID if provided
    if (billId) {
      conditions.push(eq(bills.id, parseInt(billId, 10)));
    }

    // Filter based on user type
    if (session.user.userType === 'customer' && !billId) {
      conditions.push(eq(bills.customerId, session.user.customerId!));
    } else if (customerId) {
      conditions.push(eq(bills.customerId, parseInt(customerId, 10)));
    }

    // Filter by month if provided (format: YYYY-MM-01)
    if (month) {
      // Use date range to handle both DATE and DATETIME columns
      const monthStart = new Date(month);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];
      conditions.push(
        sql`${bills.billingMonth} >= ${monthStartStr} AND ${bills.billingMonth} < ${monthEndStr}`
      );
    }

    // Filter by status - supports single value or comma-separated values
    if (status) {
      const statusValues = status.split(',').map(s => s.trim());
      if (statusValues.length === 1) {
        conditions.push(eq(bills.status, statusValues[0] as any));
      } else {
        conditions.push(inArray(bills.status, statusValues as any));
      }
    }

    if (fromDate) {
      conditions.push(gte(bills.issueDate, fromDate as any));
    }

    if (toDate) {
      conditions.push(lte(bills.issueDate, toDate as any));
    }

    // Handle search by account number
    if (search) {
      conditions.push(like(customers.accountNumber, `%${search}%`));
    }

    let query = db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        customerName: customers.fullName,
        accountNumber: customers.accountNumber,
        billingMonth: bills.billingMonth,
        billingPeriod: bills.billingMonth,
        issueDate: bills.issueDate,
        dueDate: bills.dueDate,
        unitsConsumed: bills.unitsConsumed,
        meterReadingId: bills.meterReadingId,
        baseAmount: bills.baseAmount,
        fixedCharges: bills.fixedCharges,
        electricityDuty: bills.electricityDuty,
        gstAmount: bills.gstAmount,
        totalAmount: bills.totalAmount,
        status: bills.status,
        paymentDate: bills.paymentDate,
        tariffId: bills.tariffId,
        // Meter reading data
        previousReading: meterReadings.previousReading,
        currentReading: meterReadings.currentReading,
        readingDate: meterReadings.readingDate,
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .leftJoin(meterReadings, eq(bills.meterReadingId, meterReadings.id))
      .$dynamic();

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    const billsResult = await query.orderBy(desc(bills.issueDate)).limit(limit).offset(offset);

    // Fetch tariff slabs for each bill
    const result = await Promise.all(billsResult.map(async (bill) => {
      if (bill.tariffId) {
        const slabs = await db
          .select()
          .from(tariffSlabs)
          .where(eq(tariffSlabs.tariffId, bill.tariffId))
          .orderBy(asc(tariffSlabs.slabOrder));

        return {
          ...bill,
          tariffSlabs: slabs
        };
      }
      return {
        ...bill,
        tariffSlabs: []
      };
    }));

    // Get total count and aggregate stats
    let countQuery = db
      .select({
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${bills.totalAmount} AS DECIMAL(10,2))), 0)`,
        pending: sql<number>`SUM(CASE WHEN ${bills.status} = 'pending' THEN 1 ELSE 0 END)`,
        issued: sql<number>`SUM(CASE WHEN ${bills.status} = 'issued' THEN 1 ELSE 0 END)`,
        paid: sql<number>`SUM(CASE WHEN ${bills.status} = 'paid' THEN 1 ELSE 0 END)`,
        overdue: sql<number>`SUM(CASE WHEN ${bills.status} = 'overdue' THEN 1 ELSE 0 END)`,
        cancelled: sql<number>`SUM(CASE WHEN ${bills.status} = 'cancelled' THEN 1 ELSE 0 END)`,
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .$dynamic();

    if (conditions.length > 0) {
      countQuery = countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
    }

    const [aggregateStats] = await countQuery;

    return NextResponse.json({
      success: true,
      data: result,
      stats: {
        total: Number(aggregateStats.count || 0),
        totalAmount: Number(aggregateStats.totalAmount || 0),
        pending: Number(aggregateStats.pending || 0),
        issued: Number(aggregateStats.issued || 0),
        paid: Number(aggregateStats.paid || 0),
        overdue: Number(aggregateStats.overdue || 0),
        cancelled: Number(aggregateStats.cancelled || 0),
      },
      pagination: {
        page,
        limit,
        total: Number(aggregateStats.count || 0),
        totalPages: Math.ceil(Number(aggregateStats.count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

// POST /api/bills/generate - Generate new bill
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and employees can generate bills
    if (session.user.userType === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { customerId, billingMonth } = body;

    if (!customerId || !billingMonth) {
      return NextResponse.json(
        { error: 'customerId and billingMonth are required' },
        { status: 400 }
      );
    }

    // Check if bill already exists for this month
    const [existingBill] = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.customerId, customerId),
          eq(bills.billingMonth, billingMonth)
        )
      )
      .limit(1);

    if (existingBill) {
      return NextResponse.json(
        { error: 'Bill already exists for this month' },
        { status: 400 }
      );
    }

    // Get latest meter reading for this customer
    const [latestReading] = await db
      .select()
      .from(meterReadings)
      .where(eq(meterReadings.customerId, customerId))
      .orderBy(desc(meterReadings.readingDate))
      .limit(1);

    if (!latestReading) {
      return NextResponse.json(
        { error: 'No meter reading found for this customer' },
        { status: 400 }
      );
    }

    // Get customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get applicable tariff
    const [tariff] = await db
      .select()
      .from(tariffs)
      .where(eq(tariffs.category, customer.connectionType))
      .orderBy(desc(tariffs.effectiveDate))
      .limit(1);

    if (!tariff) {
      return NextResponse.json(
        { error: 'No tariff found for customer connection type' },
        { status: 400 }
      );
    }

    // Get tariff slabs for calculation
    const slabs = await db
      .select()
      .from(tariffSlabs)
      .where(eq(tariffSlabs.tariffId, tariff.id))
      .orderBy(asc(tariffSlabs.slabOrder));

    if (slabs.length === 0) {
      return NextResponse.json(
        { error: 'No tariff slabs found for the selected tariff' },
        { status: 400 }
      );
    }

    // Calculate bill amount using tariff slabs
    const unitsConsumed = parseFloat(latestReading.unitsConsumed);
    let baseAmount = 0;
    let remainingUnits = unitsConsumed;

    // Apply slab rates from normalized tariff_slabs table
    for (const slab of slabs) {
      if (remainingUnits <= 0) break;

      const slabStart = Number(slab.startUnits);
      const slabEnd = slab.endUnits ? Number(slab.endUnits) : Infinity;
      const slabRate = Number(slab.ratePerUnit);

      const unitsInSlab = Math.min(remainingUnits, slabEnd - slabStart);
      baseAmount += unitsInSlab * slabRate;
      remainingUnits -= unitsInSlab;
    }

    const fixedCharges = parseFloat(tariff.fixedCharge);
    const electricityDuty = baseAmount * (parseFloat(tariff.electricityDutyPercent || '0') / 100);
    const subtotal = baseAmount + fixedCharges + electricityDuty;
    const gstAmount = subtotal * (parseFloat(tariff.gstPercent || '0') / 100);
    const totalAmount = subtotal + gstAmount;

    // Generate bill number
    const billNumber = `BILL-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

    // Create bill
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15); // 15 days payment period

    await db.insert(bills).values({
      customerId,
      billNumber,
      billingMonth,
      issueDate: issueDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      unitsConsumed: unitsConsumed.toString(),
      meterReadingId: latestReading.id,
      baseAmount: baseAmount.toFixed(2),
      fixedCharges: fixedCharges.toFixed(2),
      electricityDuty: electricityDuty.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      status: 'issued',
    } as any);

    // Update customer's last bill amount
    await db
      .update(customers)
      .set({
        lastBillAmount: totalAmount.toFixed(2),
        outstandingBalance: sql`${customers.outstandingBalance} + ${totalAmount}`,
      })
      .where(eq(customers.id, customerId));

    // Create notification for new bill
    if (customer?.userId) {
      await db.insert(notifications).values({
        userId: customer.userId,
        notificationType: 'billing',
        title: 'New Bill Generated',
        message: `Your electricity bill for ${billingMonth} has been generated. Amount: Rs. ${totalAmount.toFixed(2)}. Due date: ${dueDate.toISOString().split('T')[0]}`,
        priority: 'high',
        actionUrl: '/customer/bills',
        actionText: 'View Bill',
        isRead: 0,
      } as any);
    }

    return NextResponse.json({
      success: true,
      message: 'Bill generated successfully',
      data: {
        billNumber,
        totalAmount: totalAmount.toFixed(2),
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating bill:', error);
    return NextResponse.json(
      { error: 'Failed to generate bill' },
      { status: 500 }
    );
  }
}

