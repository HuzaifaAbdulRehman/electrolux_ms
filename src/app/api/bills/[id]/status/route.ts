import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { bills, payments, customers, notifications, users } from '@/lib/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can update bill status
    if (session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      );
    }

    const billId = parseInt(params.id);
    if (isNaN(billId)) {
      return NextResponse.json(
        { error: 'Invalid bill ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, paidDate, paymentMethod, transactionRef, notes } = body;

    console.log('[Bill Status Update] Request:', { billId, status, paymentMethod, transactionRef });

    // Validate status
    const validStatuses = ['pending', 'issued', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Validate payment details if marking as paid
    if (status === 'paid') {
      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Payment method is required when marking bill as paid' },
          { status: 400 }
        );
      }

      if (!transactionRef || transactionRef.trim().length < 5) {
        return NextResponse.json(
          { error: 'Transaction reference is required (minimum 5 characters)' },
          { status: 400 }
        );
      }

      const validPaymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'cheque', 'upi', 'wallet'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: 'Invalid payment method. Must be one of: ' + validPaymentMethods.join(', ') },
          { status: 400 }
        );
      }
    }

    // Check if bill exists
    const [existingBill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!existingBill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Prevent double payment - check if already paid
    if (status === 'paid' && existingBill.status === 'paid') {
      return NextResponse.json(
        {
          error: 'Bill is already marked as paid',
          details: {
            paymentDate: existingBill.paymentDate,
            message: 'This bill was already paid. Cannot mark as paid again.'
          }
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    // If marking as paid, set paid date
    const currentPaidDate = paidDate ? new Date(paidDate) : new Date();
    if (status === 'paid') {
      updateData.paymentDate = currentPaidDate;
    }

    // CRITICAL: Create payment record if marking as paid
    let paymentRecord = null;
    if (status === 'paid') {
      try {
        // Generate unique receipt number: RCPT-YYYY-XXXXXXXX
        const receiptNumber = `RCPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;

        console.log('[Payment Creation] Creating payment record:', {
          billId,
          customerId: existingBill.customerId,
          amount: existingBill.totalAmount,
          method: paymentMethod,
          receiptNumber
        });

        // Insert payment record
        const paymentData = {
          customerId: existingBill.customerId,
          billId: billId,
          paymentAmount: existingBill.totalAmount,
          paymentMethod: paymentMethod,
          paymentDate: currentPaidDate,
          transactionId: transactionRef,
          receiptNumber: receiptNumber,
          status: 'completed' as const,
          notes: notes || `Admin payment - Bill #${billId}`,
        };

        const insertResult = await db
          .insert(payments)
          .values(paymentData);

        // Fetch the inserted payment record
        const [newPayment] = await db
          .select()
          .from(payments)
          .where(eq(payments.receiptNumber, receiptNumber))
          .limit(1);

        paymentRecord = newPayment;
        console.log('[Payment Creation] ✅ Payment record created:', paymentRecord?.id);

        // Update customer outstanding balance
        await db
          .update(customers)
          .set({
            outstandingBalance: sql`GREATEST(CAST(${customers.outstandingBalance} AS DECIMAL(10,2)) - ${existingBill.totalAmount}, 0)`,
            lastPaymentDate: currentPaidDate
          })
          .where(eq(customers.id, existingBill.customerId));

        console.log('[Payment Creation] ✅ Customer balance updated');

        // Send notification to customer
        try {
          const [customer] = await db
            .select({ userId: customers.userId })
            .from(customers)
            .where(eq(customers.id, existingBill.customerId))
            .limit(1);

          if (customer) {
            await db.insert(notifications).values({
              userId: customer.userId,
              notificationType: 'payment',
              title: 'Payment Received',
              message: `Payment of Rs ${parseFloat(existingBill.totalAmount).toLocaleString()} received for bill #${billId}. Receipt: ${receiptNumber}`,
              priority: 'normal',
              actionUrl: '/customer/view-bills',
              isRead: 0,
            } as any);
            console.log('[Payment Creation] ✅ Customer notified');
          }
        } catch (notifError) {
          console.error('[Payment Creation] ⚠️ Notification failed:', notifError);
          // Don't fail payment if notification fails
        }

      } catch (paymentError) {
        console.error('[Payment Creation] ❌ Failed to create payment record:', paymentError);
        return NextResponse.json(
          { error: 'Failed to create payment record. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Update bill status
    await db
      .update(bills)
      .set(updateData)
      .where(eq(bills.id, billId));

    console.log('[Bill Status Update] ✅ Bill status updated to:', status);

    return NextResponse.json({
      success: true,
      message: `Bill status updated to ${status}`,
      data: {
        id: billId,
        status,
        paymentDate: updateData.paymentDate,
        paymentRecord: paymentRecord ? {
          id: paymentRecord.id,
          receiptNumber: paymentRecord.receiptNumber,
          amount: paymentRecord.paymentAmount,
          method: paymentRecord.paymentMethod
        } : null
      }
    });
  } catch (error) {
    console.error('Error updating bill status:', error);
    return NextResponse.json(
      { error: 'Failed to update bill status' },
      { status: 500 }
    );
  }
}
