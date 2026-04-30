import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { payments, bills, customers, notifications, users } from '@/lib/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// GET /api/payments - Get payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: payments.id,
        customerName: customers.fullName,
        accountNumber: customers.accountNumber,
        paymentAmount: payments.paymentAmount,
        paymentMethod: payments.paymentMethod,
        paymentDate: payments.paymentDate,
        transactionId: payments.transactionId,
        receiptNumber: payments.receiptNumber,
        status: payments.status,
        billNumber: bills.billNumber,
      })
      .from(payments)
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .leftJoin(bills, eq(payments.billId, bills.id))
      .$dynamic();

    const conditions = [];

    // Filter based on user type
    if (session.user.userType === 'customer') {
      conditions.push(eq(payments.customerId, session.user.customerId!));
    } else if (customerId) {
      conditions.push(eq(payments.customerId, parseInt(customerId, 10)));
    }

    if (conditions.length > 0) {
      query = query.where(conditions[0] as any);
    }

    query = query.orderBy(desc(payments.paymentDate)).limit(limit).offset(offset);
    const result = await query;

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(payments).$dynamic();
    if (conditions.length > 0) {
      countQuery = countQuery.where(conditions[0] as any);
    }
    const [{ count }] = await countQuery;

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST /api/payments - Process payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billId, paymentMethod, amount, paymentDate } = body;

    if (!billId || !paymentMethod || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use provided payment date or default to today
    const recordedPaymentDate = paymentDate || new Date().toISOString().split('T')[0];

    // Get bill details
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Verify customer owns this bill (if customer)
    if (session.user.userType === 'customer' && bill.customerId !== session.user.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if bill is already paid
    if (bill.status === 'paid') {
      return NextResponse.json({ error: 'Bill has already been paid' }, { status: 400 });
    }

    // Check for duplicate payments (prevent double payment)
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.billId, billId), eq(payments.status, 'completed')))
      .limit(1);

    if (existingPayment) {
      return NextResponse.json({
        error: 'A payment for this bill already exists',
        payment: {
          transactionId: existingPayment.transactionId,
          receiptNumber: existingPayment.receiptNumber,
          paymentDate: existingPayment.paymentDate
        }
      }, { status: 400 });
    }

    // Generate transaction and receipt numbers
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;

    // Determine if this is full or partial payment
    const billAmount = parseFloat(bill.totalAmount);
    const paymentAmount = parseFloat(amount.toString());
    const isFullPayment = Math.abs(paymentAmount - billAmount) < 0.01; // Allow 1 paisa tolerance for rounding

    // 🔒 TRANSACTION FIX: Wrap all payment operations in a transaction for atomicity
    // This ensures either ALL operations succeed or ALL are rolled back (no partial payments)
    let paymentId: number;

    await db.transaction(async (tx) => {
    // Create payment
    const payment = await tx.insert(payments).values({
      customerId: bill.customerId,
      billId: bill.id,
      paymentAmount: amount.toString(),
      paymentMethod,
      paymentDate: recordedPaymentDate,
      transactionId,
      receiptNumber,
      status: 'completed',
    } as any);

      paymentId = (payment as any).insertId;

    // Update bill status - only mark as 'paid' if full amount received
    // Keep as 'issued' for partial payments
    await tx
      .update(bills)
      .set({
        status: isFullPayment ? 'paid' : 'issued',
        paymentDate: isFullPayment ? recordedPaymentDate : undefined,
      } as any)
      .where(eq(bills.id, billId));

    // Get customer's current outstanding balance before update
    const [customerData] = await tx
      .select({ outstandingBalance: customers.outstandingBalance })
      .from(customers)
      .where(eq(customers.id, bill.customerId))
      .limit(1);

    const currentOutstanding = parseFloat(customerData?.outstandingBalance || '0');
    const newOutstanding = Math.max(0, currentOutstanding - paymentAmount);

    // Update customer outstanding balance and payment status
    await tx
      .update(customers)
      .set({
        outstandingBalance: newOutstanding.toFixed(2),
        lastPaymentDate: recordedPaymentDate,
        paymentStatus: newOutstanding < 0.01 ? 'paid' : 'pending',
      } as any)
      .where(eq(customers.id, bill.customerId));

    });  // End transaction

    // Get customer's user ID for notification
    const [customer] = await db
      .select({ userId: customers.userId })
      .from(customers)
      .where(eq(customers.id, bill.customerId))
      .limit(1);

    // Create payment notification
    if (customer?.userId) {
      await db.insert(notifications).values({
        userId: customer.userId,
        notificationType: 'payment',
        title: 'Payment Received',
        message: `Payment of Rs. ${amount} has been successfully processed for bill ${bill.billNumber}`,
        priority: 'normal',
        actionUrl: '/customer/payment',
        actionText: 'View Receipt',
        isRead: 0,
      } as any);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        paymentId: paymentId!,
        transactionId,
        receiptNumber,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}

