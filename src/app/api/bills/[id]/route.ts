import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { bills, customers } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(
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

    const billId = parseInt(params.id);
    if (isNaN(billId)) {
      return NextResponse.json(
        { error: 'Invalid bill ID' },
        { status: 400 }
      );
    }

    // Fetch bill with customer information
    const result = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        customerId: bills.customerId,
        customerName: customers.fullName,
        billingPeriod: bills.billingMonth,
        issueDate: bills.issueDate,
        dueDate: bills.dueDate,
        unitsConsumed: bills.unitsConsumed,
        baseAmount: bills.baseAmount,
        fixedCharges: bills.fixedCharges,
        electricityDuty: bills.electricityDuty,
        gstAmount: bills.gstAmount,
        totalAmount: bills.totalAmount,
        status: bills.status,
        paymentDate: bills.paymentDate,
        tariffId: bills.tariffId,
        createdAt: bills.createdAt,
        updatedAt: bills.updatedAt
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .where(eq(bills.id, billId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}
