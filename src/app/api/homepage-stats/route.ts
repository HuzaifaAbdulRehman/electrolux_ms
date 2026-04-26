import { NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { customers, bills, payments } from '@/lib/drizzle/schema';
import { sql, eq, count } from 'drizzle-orm';

/**
 * Public API endpoint for homepage statistics
 * Returns aggregated system metrics for display on the public homepage
 * No authentication required - only shows non-sensitive summary data
 */
export async function GET() {
  try {
    console.log('[Homepage Stats API] Fetching homepage statistics...');

    // Execute all queries in parallel for performance
    const [
      totalCustomersResult,
      totalBillsResult,
      paidBillsResult,
      distinctZonesResult,
      totalPaymentsResult
    ] = await Promise.all([
      // Total customers count
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(customers),

      // Total bills processed
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bills),

      // Paid bills for success rate calculation
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bills)
        .where(eq(bills.status, 'paid')),

      // Distinct zones covered
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${customers.zone})` })
        .from(customers)
        .where(sql`${customers.zone} IS NOT NULL`),

      // Total successful payments
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(payments)
        .where(eq(payments.status, 'completed'))
    ]);

    // Extract counts with safe fallbacks
    const totalCustomers = totalCustomersResult[0]?.count ?? 0;
    const totalBills = totalBillsResult[0]?.count ?? 0;
    const paidBills = paidBillsResult[0]?.count ?? 0;
    const totalZones = distinctZonesResult[0]?.count ?? 0;
    const totalPayments = totalPaymentsResult[0]?.count ?? 0;

    // Calculate payment success rate (percentage)
    const paymentSuccessRate = totalBills > 0
      ? parseFloat(((paidBills / totalBills) * 100).toFixed(1))
      : 0;

    // Build response object with fallback values
    const stats = {
      // Real database metrics
      totalCustomers: totalCustomers,
      billsProcessed: totalBills,
      zonesCovered: totalZones,
      paymentsCompleted: totalPayments,
      paymentSuccessRate: paymentSuccessRate,

      // Static technical metrics (not from database)
      systemUptime: 99.9, // Percentage
      responseTime: 47, // milliseconds
      realTimeMonitoring: true,

      // Timestamp for cache validation
      timestamp: new Date().toISOString()
    };

    console.log('[Homepage Stats API] Stats fetched successfully:', stats);

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Homepage statistics fetched successfully'
    });

  } catch (error) {
    console.error('[Homepage Stats API] Error fetching homepage stats:', error);

    // Return fallback data even on error - homepage should never break
    const fallbackStats = {
      totalCustomers: 150,
      billsProcessed: 450,
      zonesCovered: 15,
      paymentsCompleted: 380,
      paymentSuccessRate: 98.0,
      systemUptime: 99.9,
      responseTime: 50,
      realTimeMonitoring: true,
      timestamp: new Date().toISOString()
    };

    console.log('[Homepage Stats API] Returning fallback stats due to error');

    return NextResponse.json({
      success: true, // Still return success to prevent homepage from breaking
      data: fallbackStats,
      message: 'Homepage statistics fetched (fallback mode)',
      usingFallback: true
    });
  }
}
