import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, bills, payments, meterReadings } from '@/lib/drizzle/schema';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow customers to access this endpoint
    if (session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get period parameter from query string
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6months';

    console.log('[Customer Dashboard API] Fetching dashboard data for customer:', session.user.id, 'Period:', period);

    // Get customer details using the numeric userId
    const userId = parseInt(session.user.id, 10);
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId));

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Calculate date range based on period
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().substring(0, 7);

    let startDate: Date;
    let billLimit = 6;
    let extendedBillLimit = 12;

    switch (period) {
      case 'month':
        // Current month only
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        billLimit = 1;
        extendedBillLimit = 1;
        break;
      case 'lastMonth':
        // Last month only
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        billLimit = 1;
        extendedBillLimit = 1;
        break;
      case '3months':
        // Last 3 months
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
        billLimit = 3;
        extendedBillLimit = 3;
        break;
      case '6months':
        // Last 6 months (default)
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        billLimit = 6;
        extendedBillLimit = 12;
        break;
      case 'all':
        // All time
        startDate = new Date(2020, 0, 1); // From 2020
        billLimit = 12;
        extendedBillLimit = 24;
        break;
      default:
        // Default to 6 months
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        billLimit = 6;
        extendedBillLimit = 12;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    console.log('[Customer Dashboard API] Date filter:', startDateStr, 'Limit:', billLimit);

    // Get current bill (bill for the current billing month, NOT just most recently created)
    // This ensures "current bill" actually means bill for current month (e.g., October 2025)
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const [currentBill] = await db
      .select()
      .from(bills)
      .where(and(
        eq(bills.customerId, customer.id),
        gte(bills.billingMonth, currentMonthStart),
        lte(bills.billingMonth, currentMonthEnd)
      ))
      .orderBy(desc(bills.createdAt))
      .limit(1);

    console.log('[Customer Dashboard API] Current month:', currentMonth, 'Current bill:', currentBill ? `${currentBill.billNumber} (${currentBill.billingMonth})` : 'No bill for current month');

    // Get recent bills (filtered by period)
    const recentBills = await db
      .select()
      .from(bills)
      .where(and(
        eq(bills.customerId, customer.id),
        gte(bills.billingMonth, startDate)
      ))
      .orderBy(desc(bills.billingMonth))
      .limit(billLimit);

    // Get extended bills history (for analytics - double the limit)
    const extendedBills = await db
      .select()
      .from(bills)
      .where(and(
        eq(bills.customerId, customer.id),
        gte(bills.billingMonth, startDate)
      ))
      .orderBy(desc(bills.billingMonth))
      .limit(extendedBillLimit);

    // Get recent payments (filtered by period)
    const recentPayments = await db
      .select({
        id: payments.id,
        billId: payments.billId,
        paymentAmount: payments.paymentAmount,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        receiptNumber: payments.receiptNumber
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .where(and(
        eq(bills.customerId, customer.id),
        gte(payments.paymentDate, startDate)
      ))
      .orderBy(desc(payments.paymentDate))
      .limit(Math.min(billLimit, 5));

    // Get monthly payment aggregation (filtered by period) for Payment History chart
    const monthlyPayments = await db
      .select({
        month: sql<string>`DATE_FORMAT(${payments.paymentDate}, '%Y-%m')`,
        totalPaid: sql<number>`COALESCE(SUM(${payments.paymentAmount}), 0)`,
        paymentCount: sql<number>`COUNT(${payments.id})`
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .where(and(
        eq(bills.customerId, customer.id),
        gte(payments.paymentDate, startDate)
      ))
      .groupBy(sql`DATE_FORMAT(${payments.paymentDate}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${payments.paymentDate}, '%Y-%m') DESC`)
      .limit(billLimit);

    console.log('[Customer Dashboard API] Monthly payments aggregated:', monthlyPayments.length, 'months');

    // Get consumption history (last 6 months from bills) - sorted chronologically
    const consumptionHistory = recentBills
      .map(bill => ({
        billingPeriod: bill.billingMonth,
        unitsConsumed: parseFloat(bill.unitsConsumed?.toString() || '0'),
        totalAmount: parseFloat(bill.totalAmount?.toString() || '0')
      }))
      .sort((a, b) => new Date(a.billingPeriod).getTime() - new Date(b.billingPeriod).getTime());

    // Extended consumption history for analytics (12 months with bill breakdown)
    const extendedConsumptionHistory = extendedBills
      .map(bill => ({
        billingPeriod: bill.billingMonth,
        unitsConsumed: parseFloat(bill.unitsConsumed?.toString() || '0'),
        totalAmount: parseFloat(bill.totalAmount?.toString() || '0'),
        baseAmount: parseFloat(bill.baseAmount?.toString() || '0'),
        fixedCharges: parseFloat(bill.fixedCharges?.toString() || '0'),
        electricityDuty: parseFloat(bill.electricityDuty?.toString() || '0'),
        gstAmount: parseFloat(bill.gstAmount?.toString() || '0'),
        costPerUnit: parseFloat(bill.unitsConsumed?.toString() || '0') > 0
          ? parseFloat(bill.totalAmount?.toString() || '0') / parseFloat(bill.unitsConsumed?.toString() || '1')
          : 0
      }))
      .sort((a, b) => new Date(a.billingPeriod).getTime() - new Date(b.billingPeriod).getTime());

    // Get latest meter reading (cumulative reading from meter)
    const [latestMeterReading] = await db
      .select({
        currentReading: meterReadings.currentReading,
        readingDate: meterReadings.readingDate
      })
      .from(meterReadings)
      .where(eq(meterReadings.customerId, customer.id))
      .orderBy(desc(meterReadings.readingDate))
      .limit(1);

    // Calculate average consumption from last 6 months
    const avgConsumption = consumptionHistory.length > 0
      ? Math.round(consumptionHistory.reduce((sum, item) => sum + item.unitsConsumed, 0) / consumptionHistory.length)
      : 0;

    // Calculate average monthly cost (rounded to whole number - real-world payment standard)
    const avgMonthlyCost = consumptionHistory.length > 0
      ? Math.round(consumptionHistory.reduce((sum, item) => sum + item.totalAmount, 0) / consumptionHistory.length)
      : 0;

    // Calculate consumption trend (comparing last 2 months)
    let consumptionTrend = 'stable';
    let trendPercentage = 0;
    if (consumptionHistory.length >= 2) {
      const current = consumptionHistory[consumptionHistory.length - 1].unitsConsumed;
      const previous = consumptionHistory[consumptionHistory.length - 2].unitsConsumed;
      if (previous > 0) {
        trendPercentage = Math.round(((current - previous) / previous) * 100);
        if (trendPercentage > 10) consumptionTrend = 'increasing';
        else if (trendPercentage < -10) consumptionTrend = 'decreasing';
      }
    }

    // Calculate outstanding balance (sum of all unpaid bills)
    const [outstandingResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`
      })
      .from(bills)
      .where(and(
        eq(bills.customerId, customer.id),
        eq(bills.status, 'issued')
      ));

    // Calculate total paid amount (lifetime)
    const [totalPaidResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.paymentAmount}), 0)`
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .where(eq(bills.customerId, customer.id));

    // Round bill amounts to whole numbers (real-world payment standard)
    const roundedCurrentBill = currentBill ? {
      ...currentBill,
      totalAmount: Math.round(parseFloat(currentBill.totalAmount?.toString() || '0')),
      baseAmount: Math.round(parseFloat(currentBill.baseAmount?.toString() || '0')),
      fixedCharges: Math.round(parseFloat(currentBill.fixedCharges?.toString() || '0')),
      electricityDuty: Math.round(parseFloat(currentBill.electricityDuty?.toString() || '0')),
      gstAmount: Math.round(parseFloat(currentBill.gstAmount?.toString() || '0'))
    } : null;

    const roundedRecentBills = recentBills.map(bill => ({
      ...bill,
      totalAmount: Math.round(parseFloat(bill.totalAmount?.toString() || '0')),
      baseAmount: Math.round(parseFloat(bill.baseAmount?.toString() || '0')),
      fixedCharges: Math.round(parseFloat(bill.fixedCharges?.toString() || '0')),
      electricityDuty: Math.round(parseFloat(bill.electricityDuty?.toString() || '0')),
      gstAmount: Math.round(parseFloat(bill.gstAmount?.toString() || '0'))
    }));

    const dashboardData = {
      accountNumber: customer.accountNumber,
      customer: customer, // Add customer data for dashboard
      currentBill: roundedCurrentBill,
      recentBills: roundedRecentBills,
      recentPayments: recentPayments || [],
      monthlyPayments: monthlyPayments || [], // For payment history chart
      consumptionHistory: consumptionHistory || [], // Last 6 months for dashboard
      extendedConsumptionHistory: extendedConsumptionHistory || [], // Last 12 months for analytics
      latestMeterReading: latestMeterReading || null, // Current cumulative meter reading
      avgConsumption: avgConsumption,
      avgMonthlyCost: avgMonthlyCost,
      consumptionTrend: consumptionTrend,
      trendPercentage: trendPercentage,
      outstandingBalance: Math.round(parseFloat(outstandingResult?.total?.toString() || '0')).toString(), // Round to whole number
      totalPaid: Math.round(parseFloat(totalPaidResult?.total?.toString() || '0')).toString() // Round to whole number
    };

    console.log('[Customer Dashboard API] Dashboard data fetched successfully');
    console.log('[Customer Dashboard API] Outstanding balance:', dashboardData.outstandingBalance);

    return NextResponse.json({
      success: true,
      data: dashboardData,
      message: 'Customer dashboard data fetched successfully'
    });

  } catch (error: any) {
    console.error('[Customer Dashboard API] Error fetching dashboard data:', error);
    return NextResponse.json({
      error: 'Failed to fetch customer dashboard data',
      details: error.message
    }, { status: 500 });
  }
}

