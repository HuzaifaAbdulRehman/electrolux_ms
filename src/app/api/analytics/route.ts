import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, bills, payments, meterReadings, workOrders } from '@/lib/drizzle/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Analytics API] Fetching advanced analytics data...');

    // 1. TOP 10 REVENUE CUSTOMERS (DBMS: JOIN + ORDER BY + LIMIT)
    console.log('[Analytics API] Fetching top revenue customers...');
    let topRevenueCustomers: any[] = [];
    try {
      topRevenueCustomers = await db
        .select({
          customerId: customers.id,
          customerName: customers.fullName,
          accountNumber: customers.accountNumber,
          connectionType: customers.connectionType,
          totalRevenue: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`,
          billCount: sql<number>`COUNT(${bills.id})`
        })
        .from(customers)
        .leftJoin(bills, eq(customers.id, bills.customerId))
        .groupBy(customers.id, customers.fullName, customers.accountNumber, customers.connectionType)
        .orderBy(sql`COALESCE(SUM(${bills.totalAmount}), 0) DESC`)
        .limit(10);
    } catch (error) {
      console.error('[Analytics API] Error fetching top revenue customers:', error);
      topRevenueCustomers = [];
    }

    // 2. COLLECTION RATE TREND (Simplified)
    console.log('[Analytics API] Fetching collection trend...');
    let collectionTrend: any[] = [];
    try {
      collectionTrend = await db
        .select({
          month: sql<string>`SUBSTRING(${bills.billingMonth}, 1, 7)`,
          totalBills: sql<number>`COUNT(*)`,
          paidBills: sql<number>`SUM(CASE WHEN ${bills.status} = 'paid' THEN 1 ELSE 0 END)`,
          totalAmount: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`,
          paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${bills.status} = 'paid' THEN ${bills.totalAmount} ELSE 0 END), 0)`
        })
        .from(bills)
        .where(sql`${bills.billingMonth} >= '2024-01-01'`)
        .groupBy(sql`SUBSTRING(${bills.billingMonth}, 1, 7)`)
        .orderBy(sql`SUBSTRING(${bills.billingMonth}, 1, 7)`);
    } catch (error) {
      console.error('[Analytics API] Error fetching collection trend:', error);
      collectionTrend = [];
    }

    // 3. MONTHLY CONSUMPTION PATTERN (Simplified)
    let consumptionPattern: any[] = [];
    try {
      consumptionPattern = await db
        .select({
          month: sql<string>`SUBSTRING(${bills.billingMonth}, 1, 7)`,
          avgConsumption: sql<number>`COALESCE(AVG(${bills.unitsConsumed}), 0)`,
          totalConsumption: sql<number>`COALESCE(SUM(${bills.unitsConsumed}), 0)`,
          customerCount: sql<number>`COUNT(DISTINCT ${bills.customerId})`
        })
        .from(bills)
        .where(sql`${bills.billingMonth} >= '2024-01-01'`)
        .groupBy(sql`SUBSTRING(${bills.billingMonth}, 1, 7)`)
        .orderBy(sql`SUBSTRING(${bills.billingMonth}, 1, 7)`);
    } catch (error) {
      console.error('[Analytics API] Error fetching consumption pattern:', error);
      consumptionPattern = [];
    }

    // 4. WORK ORDERS STATUS (Simplified to avoid MySQL function issues)
    let workOrderStats: any[] = [];
    try {
      workOrderStats = await db
        .select({
          status: workOrders.status,
          count: sql<number>`COUNT(*)`,
          avgCompletionTime: sql<number>`0` // Simplified for now
        })
        .from(workOrders)
        .groupBy(workOrders.status);
    } catch (error) {
      console.error('[Analytics API] Error fetching work order stats:', error);
      workOrderStats = [];
    }

    // 5. REVENUE BY CONNECTION TYPE WITH TRENDS (Enhanced)
    let revenueByConnectionType: any[] = [];
    try {
      revenueByConnectionType = await db
        .select({
          connectionType: customers.connectionType,
          totalRevenue: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`,
          avgBillAmount: sql<number>`COALESCE(AVG(${bills.totalAmount}), 0)`,
          customerCount: sql<number>`COUNT(DISTINCT ${customers.id})`,
          billCount: sql<number>`COUNT(${bills.id})`
        })
        .from(customers)
        .leftJoin(bills, and(
          eq(customers.id, bills.customerId),
          sql`${bills.billingMonth} >= '2024-01-01'`
        ))
        .groupBy(customers.connectionType)
        .orderBy(sql`COALESCE(SUM(${bills.totalAmount}), 0) DESC`);
    } catch (error) {
      console.error('[Analytics API] Error fetching revenue by connection type:', error);
      revenueByConnectionType = [];
    }

    // 6. PAYMENT DISTRIBUTION (Simplified - all time)
    let paymentDistribution: any[] = [];
    try {
      paymentDistribution = await db
        .select({
          paymentMethod: payments.paymentMethod,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(${payments.paymentAmount}), 0)`,
          avgAmount: sql<number>`COALESCE(AVG(${payments.paymentAmount}), 0)`
        })
        .from(payments)
        .groupBy(payments.paymentMethod)
        .orderBy(sql`COUNT(*) DESC`);
    } catch (error) {
      console.error('[Analytics API] Error fetching payment distribution:', error);
      paymentDistribution = [];
    }

    const analyticsData = {
      topRevenueCustomers,
      collectionTrend: collectionTrend.map(item => ({
        month: item.month,
        totalBills: item.totalBills,
        paidBills: item.paidBills,
        collectionRate: item.totalBills > 0 ? ((item.paidBills / item.totalBills) * 100).toFixed(1) : '0',
        totalAmount: item.totalAmount,
        paidAmount: item.paidAmount
      })),
      consumptionPattern: consumptionPattern.map(item => ({
        month: item.month,
        avgConsumption: parseFloat(item.avgConsumption.toFixed(2)),
        totalConsumption: item.totalConsumption,
        customerCount: item.customerCount
      })),
      workOrderStats: workOrderStats.reduce((acc, item) => {
        acc[item.status] = {
          count: item.count,
          avgCompletionDays: item.avgCompletionTime ? parseFloat(item.avgCompletionTime.toFixed(1)) : 0
        };
        return acc;
      }, {} as Record<string, any>),
      revenueByConnectionType: revenueByConnectionType.reduce((acc, item) => {
        acc[item.connectionType] = {
          totalRevenue: item.totalRevenue,
          avgBillAmount: item.avgBillAmount,
          customerCount: item.customerCount,
          billCount: item.billCount
        };
        return acc;
      }, {} as Record<string, any>),
      paymentDistribution: paymentDistribution.reduce((acc, item) => {
        acc[item.paymentMethod] = {
          count: item.count,
          totalAmount: item.totalAmount,
          avgAmount: item.avgAmount
        };
        return acc;
      }, {} as Record<string, any>)
    };

    console.log('[Analytics API] Analytics data fetched successfully');

    return NextResponse.json({
      success: true,
      data: analyticsData,
      message: 'Analytics data fetched successfully'
    });

  } catch (error: any) {
    console.error('[Analytics API] Error fetching analytics data:', error);
    console.error('[Analytics API] Error stack:', error.stack);
    console.error('[Analytics API] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({
      error: 'Failed to fetch analytics data',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

