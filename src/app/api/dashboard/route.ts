import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, bills, payments, meterReadings, workOrders, employees, outages } from '@/lib/drizzle/schema';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get period parameter from query string
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6months';

    console.log('[Dashboard API] Fetching dashboard data for:', session.user.userType, session.user.id, 'Period:', period);

    // Calculate date range based on period
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().substring(0, 7);

    let startDate: Date;
    let previousStartDate: Date;
    let monthLimit = 6;

    switch (period) {
      case 'month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        previousStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        monthLimit = 1;
        break;
      case 'lastMonth':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        previousStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
        monthLimit = 1;
        break;
      case '3months':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
        previousStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        monthLimit = 3;
        break;
      case '6months':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        previousStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 12, 1);
        monthLimit = 6;
        break;
      case 'all':
        startDate = new Date(2020, 0, 1);
        previousStartDate = new Date(2020, 0, 1);
        monthLimit = 24;
        break;
      default:
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        previousStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 12, 1);
        monthLimit = 6;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const previousStartDateStr = previousStartDate.toISOString().split('T')[0];
    const previousEndDateStr = startDateStr; // Previous period ends where current starts
    console.log('[Dashboard API] Current period:', startDateStr, 'Previous period:', previousStartDateStr, 'to', previousEndDateStr);

    // 1. BASIC METRICS (DBMS: Aggregate Functions)
    // Get customer count by status
    const customersByStatus = await db
      .select({
        status: customers.status,
        count: sql<number>`COUNT(*)`
      })
      .from(customers)
      .groupBy(customers.status);

    const activeCustomers = customersByStatus.find(c => c.status === 'active')?.count || 0;
    const suspendedCustomers = customersByStatus.find(c => c.status === 'suspended')?.count || 0;
    const inactiveCustomers = customersByStatus.find(c => c.status === 'inactive')?.count || 0;
    const totalCustomersAll = activeCustomers + suspendedCustomers + inactiveCustomers;

    const [totalEmployees] = await db
      .select({ count: sql<number>`COUNT(*)` })
        .from(employees)
        .where(eq(employees.status, 'active'));

    const [totalBills] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bills)
      .where(sql`${bills.billingMonth} >= ${startDateStr}`);

    const [activeBills] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bills)
      .where(eq(bills.status, 'issued'));

    const [totalRevenue] = await db
        .select({
        total: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`
      })
      .from(bills)
      .where(sql`${bills.billingMonth} >= ${startDateStr}`);

    // Calculate average monthly revenue based on ACTUAL months with bills, not period limit
    const monthsWithBillsResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT DATE_FORMAT(${bills.billingMonth}, '%Y-%m'))` })
      .from(bills)
      .where(sql`${bills.billingMonth} >= ${startDateStr}`);

    const revenueTotal = totalRevenue.total || 0;
    const actualMonths = (monthsWithBillsResult[0]?.count || 0) > 0 ? monthsWithBillsResult[0].count : 1;
    const averageMonthlyRevenue = revenueTotal / actualMonths;

    // Outstanding amount should come from customers table, not bills
    // Because partial payments update customer.outstandingBalance but not bill.totalAmount
    const [outstandingAmount] = await db
        .select({
        total: sql<number>`COALESCE(SUM(${customers.outstandingBalance}), 0)`
        })
        .from(customers);

    const [paidBills] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bills)
      .where(and(
        sql`${bills.billingMonth} >= ${startDateStr}`,
        eq(bills.status, 'paid')
      ));

    // 2. RECENT BILLS (DBMS: JOIN Operations)
      const recentBills = await db
        .select({
          id: bills.id,
          billNumber: bills.billNumber,
          customerName: customers.fullName,
        accountNumber: customers.accountNumber,
          totalAmount: bills.totalAmount,
          status: bills.status,
        billingMonth: bills.billingMonth,
        dueDate: bills.dueDate
        })
        .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .where(sql`${bills.billingMonth} >= ${startDateStr}`)
      .orderBy(desc(bills.createdAt))
        .limit(5);

    // 3. REVENUE BY CONNECTION TYPE (DBMS: JOIN + GROUP BY)
    const revenueByCategory = await db
        .select({
        category: customers.connectionType,
        total: sql<number>`SUM(${bills.totalAmount})`,
        billCount: sql<number>`COUNT(${bills.id})`
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .where(sql`${bills.billingMonth} >= ${startDateStr}`)
      .groupBy(customers.connectionType)
      .orderBy(sql`SUM(${bills.totalAmount}) DESC`);

    // 4. MONTHLY REVENUE TREND (DBMS: Date Functions)
    const monthlyRevenue = await db
        .select({
        month: sql<string>`DATE_FORMAT(${bills.billingMonth}, '%Y-%m')`,
        revenue: sql<number>`SUM(${bills.totalAmount})`
      })
      .from(bills)
      .where(sql`${bills.billingMonth} >= ${startDateStr}`)
      .groupBy(sql`DATE_FORMAT(${bills.billingMonth}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${bills.billingMonth}, '%Y-%m')`)
      .limit(monthLimit);

    // 5. PAYMENT METHODS (DBMS: JOIN with Payments)
    const paymentMethods = await db
        .select({
        method: payments.paymentMethod,
        count: sql<number>`COUNT(*)`,
        total: sql<number>`SUM(${payments.paymentAmount})`
        })
        .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .where(sql`${bills.billingMonth} >= ${startDateStr}`)
      .groupBy(payments.paymentMethod);

    // 6. WORK ORDERS STATUS (DBMS: Conditional Aggregation)
    const workOrderStats = await db
      .select({
        status: workOrders.status,
        count: sql<number>`COUNT(*)`
      })
      .from(workOrders)
      .groupBy(workOrders.status);

    // 7. BILLS STATUS DISTRIBUTION (DBMS: Grouping by Status)
    const billsStatusDistribution = await db
      .select({
        status: bills.status,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`
      })
      .from(bills)
      .where(sql`${bills.billingMonth} >= ${startDateStr}`)
      .groupBy(bills.status);

    // 8. CONNECTION TYPE DISTRIBUTION (DBMS: Customer Grouping)
    const connectionTypeDistribution = await db
      .select({
        connectionType: customers.connectionType,
        count: sql<number>`COUNT(*)`,
        activeCount: sql<number>`SUM(CASE WHEN ${customers.status} = 'active' THEN 1 ELSE 0 END)`
      })
      .from(customers)
      .groupBy(customers.connectionType)
      .orderBy(sql`COUNT(*) DESC`);

    // Fetch PREVIOUS PERIOD metrics for trend calculation (if not 'all' period)
    let previousMetrics = null;
    if (period !== 'all') {
      const [prevRevenue] = await db
        .select({ total: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)` })
        .from(bills)
        .where(and(
          sql`${bills.billingMonth} >= ${previousStartDateStr}`,
          sql`${bills.billingMonth} < ${previousEndDateStr}`
        ));

      const [prevTotalBills] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bills)
        .where(and(
          sql`${bills.billingMonth} >= ${previousStartDateStr}`,
          sql`${bills.billingMonth} < ${previousEndDateStr}`
        ));

      const [prevPaidBills] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bills)
        .where(and(
          sql`${bills.billingMonth} >= ${previousStartDateStr}`,
          sql`${bills.billingMonth} < ${previousEndDateStr}`,
          eq(bills.status, 'paid')
        ));

      // Count actual months with bills in PREVIOUS period
      const prevMonthsWithBillsResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT DATE_FORMAT(${bills.billingMonth}, '%Y-%m'))` })
        .from(bills)
        .where(and(
          sql`${bills.billingMonth} >= ${previousStartDateStr}`,
          sql`${bills.billingMonth} < ${previousEndDateStr}`
        ));

      const prevRevenueTotal = prevRevenue.total || 0;
      const prevActualMonths = (prevMonthsWithBillsResult[0]?.count || 0) > 0 ? prevMonthsWithBillsResult[0].count : 1;
      const prevAverageMonthlyRevenue = prevRevenueTotal / prevActualMonths;

      previousMetrics = {
        monthlyRevenue: prevAverageMonthlyRevenue,
        totalRevenue: prevRevenueTotal,
        collectionRate: prevTotalBills.count > 0 ? parseFloat(((prevPaidBills.count / prevTotalBills.count) * 100).toFixed(1)) : 0,
        totalBills: prevTotalBills.count,
        averageBillAmount: prevTotalBills.count > 0 ? prevRevenueTotal / prevTotalBills.count : 0,
        activeCustomers: activeCustomers // Use current as baseline (customers don't change much period to period)
      };
    }

    // Calculate trends
    const calculateTrend = (current: number, previous: number | null) => {
      if (previous === null || previous === 0) return { change: 0, direction: 'neutral' };
      const change = ((current - previous) / previous) * 100;
      return {
        change: parseFloat(change.toFixed(1)),
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
      };
    };

    // Calculate derived metrics
    const currentCollectionRate = totalBills.count > 0 ? parseFloat(((paidBills.count / totalBills.count) * 100).toFixed(1)) : 0;
    const currentAvgBillAmount = totalBills.count > 0 ? revenueTotal / totalBills.count : 0;

    const metrics = {
      totalCustomers: totalCustomersAll,
      activeCustomers: activeCustomers,
      suspendedCustomers: suspendedCustomers,
      inactiveCustomers: inactiveCustomers,
      totalEmployees: totalEmployees.count,
      activeBills: activeBills.count,
      monthlyRevenue: averageMonthlyRevenue,
      totalRevenue: revenueTotal,
      outstandingAmount: outstandingAmount.total || 0,
      collectionRate: currentCollectionRate,
      totalBills: totalBills.count,
      paidBills: paidBills.count,
      pendingBills: totalBills.count - paidBills.count,
      paymentRate: totalBills.count > 0 ? (paidBills.count / totalBills.count) * 100 : 0,
      averageBillAmount: currentAvgBillAmount,
      // Add trends
      trends: previousMetrics ? {
        monthlyRevenue: calculateTrend(averageMonthlyRevenue, previousMetrics.monthlyRevenue),
        collectionRate: calculateTrend(currentCollectionRate, previousMetrics.collectionRate),
        totalCustomers: calculateTrend(totalCustomersAll, previousMetrics.activeCustomers),
        averageBillAmount: calculateTrend(currentAvgBillAmount, previousMetrics.averageBillAmount),
        activeCustomers: calculateTrend(activeCustomers, previousMetrics.activeCustomers)
      } : null
    };

    // Format data for charts
    const revenueByCategoryFormatted = revenueByCategory.reduce((acc, item) => {
      acc[item.category] = item.total;
      return acc;
    }, {} as Record<string, number>);

    const monthlyRevenueFormatted = monthlyRevenue.map(item => ({
      month: item.month,
      revenue: item.revenue || 0
    }));

    const paymentMethodsFormatted = paymentMethods.reduce((acc, item) => {
      acc[item.method] = {
        count: item.count,
        total: item.total || 0
      };
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const billsStatusFormatted = billsStatusDistribution.reduce((acc, item) => {
      acc[item.status] = {
        count: item.count,
        amount: item.totalAmount
      };
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const connectionTypeFormatted = connectionTypeDistribution.reduce((acc, item) => {
      acc[item.connectionType] = {
        count: item.count,
        activeCount: item.activeCount
      };
      return acc;
    }, {} as Record<string, { count: number; activeCount: number }>);

    // 9. TOP 10 HIGH-CONSUMING CUSTOMERS (DBMS: JOIN + ORDER BY + LIMIT)
    const topConsumingCustomers = await db
      .select({
        customerId: customers.id,
        customerName: customers.fullName,
        accountNumber: customers.accountNumber,
        connectionType: customers.connectionType,
        totalConsumption: sql<number>`COALESCE(SUM(${bills.unitsConsumed}), 0)`,
        billCount: sql<number>`COUNT(${bills.id})`,
        avgConsumption: sql<number>`COALESCE(AVG(${bills.unitsConsumed}), 0)`
      })
      .from(customers)
      .leftJoin(bills, eq(customers.id, bills.customerId))
      .where(sql`${bills.billingMonth} >= ${startDateStr}`)
      .groupBy(customers.id, customers.fullName, customers.accountNumber, customers.connectionType)
      .orderBy(sql`COALESCE(SUM(${bills.unitsConsumed}), 0) DESC`)
      .limit(10);

    // 10. MONTHLY COLLECTION RATE TREND (DBMS: CASE WHEN + Date Grouping)
    const collectionRateTrend = await db
      .select({
        month: sql<string>`DATE_FORMAT(${bills.billingMonth}, '%Y-%m')`,
        totalBills: sql<number>`COUNT(*)`,
        paidBills: sql<number>`SUM(CASE WHEN ${bills.status} = 'paid' THEN 1 ELSE 0 END)`,
        totalAmount: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`,
        paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${bills.status} = 'paid' THEN ${bills.totalAmount} ELSE 0 END), 0)`
      })
      .from(bills)
      .where(sql`${bills.billingMonth} >= ${startDateStr}`)
      .groupBy(sql`DATE_FORMAT(${bills.billingMonth}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${bills.billingMonth}, '%Y-%m')`)
      .limit(monthLimit);

    const dashboardData = {
      metrics,
      recentBills,
      revenueByCategory: revenueByCategoryFormatted,
      monthlyRevenue: monthlyRevenueFormatted,
      paymentMethods: paymentMethodsFormatted,
      workOrderStats: workOrderStats.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>),
      billsStatus: billsStatusFormatted,
      connectionTypeDistribution: connectionTypeFormatted,
      topConsumingCustomers,
      collectionRateTrend: collectionRateTrend.map(item => ({
        month: item.month,
        totalBills: item.totalBills,
        paidBills: item.paidBills,
        collectionRate: item.totalBills > 0 ? parseFloat(((item.paidBills / item.totalBills) * 100).toFixed(1)) : 0,
        totalAmount: item.totalAmount,
        paidAmount: item.paidAmount
      }))
    };

    console.log('[Dashboard API] Dashboard data fetched successfully');
    console.log('[Dashboard API] Metrics:', metrics);

      return NextResponse.json({
        success: true,
      data: dashboardData,
      message: 'Dashboard data fetched successfully'
    });

  } catch (error: any) {
    console.error('[Dashboard API] Error fetching dashboard data:', error);
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      details: error.message
    }, { status: 500 });
  }
}

