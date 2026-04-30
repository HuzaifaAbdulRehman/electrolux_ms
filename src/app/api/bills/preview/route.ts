import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, meterReadings, bills, tariffs, tariffSlabs } from '@/lib/drizzle/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';

// GET /api/bills/preview - Preview bulk bill generation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const billingMonth = searchParams.get('month');
    
    if (!billingMonth || !/^\d{4}-\d{2}-01$/.test(billingMonth)) {
      return NextResponse.json({ 
        error: 'Invalid billing month format. Use YYYY-MM-01' 
      }, { status: 400 });
    }

    console.log('[Bills Preview] Analyzing bulk generation for:', billingMonth);

    // Calculate month boundaries
    const monthStart = new Date(billingMonth);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // 1. Get total active customers
    const [totalActiveCustomers] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(eq(customers.status, 'active'));

    // 2. Get customers who already have bills for this month (with detailed info)
    // IMPORTANT: Only count bills for ACTIVE customers to match totalActiveCustomers count
    // Use YEAR/MONTH comparison to handle date format inconsistencies
    const existingBills = await db
      .select({
        customerId: bills.customerId,
        billId: bills.id,
        accountNumber: customers.accountNumber,
        fullName: customers.fullName,
        totalAmount: bills.totalAmount,
        status: bills.status,
        dueDate: bills.dueDate
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .where(
        and(
          sql`YEAR(${bills.billingMonth}) = YEAR(${billingMonth}) AND MONTH(${bills.billingMonth}) = MONTH(${billingMonth})`,
          eq(customers.status, 'active')
        )
      );

    const customersWithBillsSet = new Set(existingBills.map(b => b.customerId));

    // 3. Get customers with meter readings who DON'T have bills yet
    // This shows: of the eligible customers, how many have readings ready
    const customersWithReadings = await db
      .select({
        customerId: meterReadings.customerId,
        accountNumber: customers.accountNumber,
        fullName: customers.fullName,
        connectionType: customers.connectionType,
        unitsConsumed: meterReadings.unitsConsumed,
        readingDate: meterReadings.readingDate
      })
      .from(meterReadings)
      .innerJoin(customers, eq(meterReadings.customerId, customers.id))
      .where(
        and(
          eq(customers.status, 'active'),
          sql`${meterReadings.readingDate} >= ${billingMonth}`,
          sql`${meterReadings.readingDate} < ${monthEndStr}`
        )
      );

    // Filter out customers who already have bills
    const customersWithReadingsNoBills = customersWithReadings.filter(
      c => !customersWithBillsSet.has(c.customerId)
    );

    // Separate by status
    const billsByStatus = existingBills.reduce((acc, bill) => {
      const status = bill.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(bill);
      return acc;
    }, {} as Record<string, any[]>);

    const totalExistingBills = existingBills.length;
    const totalBillAmount = existingBills.reduce((sum, bill) => {
      const amount = parseFloat(String(bill.totalAmount || '0'));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // 4. Get available tariffs
    const availableTariffs = await db
      .select()
      .from(tariffs)
      .where(
        and(
          sql`${tariffs.effectiveDate} <= ${billingMonth}`,
          sql`(${tariffs.validUntil} IS NULL OR ${tariffs.validUntil} >= ${billingMonth})`
        )
      );

    // 5. Analyze customer categories (only for customers WITH readings who need bills)
    const categoryAnalysis = customersWithReadingsNoBills.reduce((acc, customer) => {
      const category = customer.connectionType || 'Residential';
      if (!acc[category]) {
        acc[category] = { count: 0, totalUnits: 0, hasTariff: false };
      }
      acc[category].count++;
      acc[category].totalUnits += parseFloat(customer.unitsConsumed || '0');
      return acc;
    }, {} as Record<string, { count: number; totalUnits: number; hasTariff: boolean }>);

    // Check which categories have tariffs
    const tariffCategories = new Set(availableTariffs.map(t => t.category));
    Object.keys(categoryAnalysis).forEach(category => {
      categoryAnalysis[category].hasTariff = tariffCategories.has(category as any);
    });

    // 6. Calculate eligible customers
    // Total eligible = active customers minus UNIQUE customers who have bills
    // Note: Use customersWithBillsSet.size (unique customers) NOT totalExistingBills (total bill count)
    // because a customer might have multiple bills for the same month
    const totalEligibleForGeneration = totalActiveCustomers.count - customersWithBillsSet.size;

    // 7. Fetch tariff slabs for all available tariffs
    const tariffSlabsMap = new Map<number, any[]>();
    for (const tariff of availableTariffs) {
      const slabs = await db
        .select()
        .from(tariffSlabs)
        .where(eq(tariffSlabs.tariffId, tariff.id))
        .orderBy(asc(tariffSlabs.slabOrder));
      tariffSlabsMap.set(tariff.id, slabs);
    }

    // 8. Calculate estimated revenue (for customers WITH readings)
    let estimatedRevenue = 0;
    const tariffMap = new Map(availableTariffs.map(t => [t.category, t]));

    for (const customer of customersWithReadingsNoBills) {
      const category = customer.connectionType || 'Residential';
      const tariff = tariffMap.get(category as 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural');

      if (tariff) {
        const units = Number(customer.unitsConsumed || '0');
        const fixedCharges = Number(tariff.fixedCharge);
        const slabs = tariffSlabsMap.get(tariff.id) || [];

        // Calculate base amount using tariff slabs
        let baseAmount = 0;
        let remainingUnits = units;

        for (const slab of slabs) {
          if (remainingUnits <= 0) break;

          const slabStart = Number(slab.startUnits);
          const slabEnd = slab.endUnits ? Number(slab.endUnits) : Infinity;
          const slabRate = Number(slab.ratePerUnit);

          const unitsInSlab = Math.min(remainingUnits, slabEnd - slabStart);
          baseAmount += unitsInSlab * slabRate;
          remainingUnits -= unitsInSlab;
        }

        const electricityDuty = baseAmount * (Number(tariff.electricityDutyPercent ?? 0) / 100);
        const gstAmount = (baseAmount + fixedCharges + electricityDuty) * (Number(tariff.gstPercent ?? 0) / 100);
        const totalAmount = baseAmount + fixedCharges + electricityDuty + gstAmount;

        estimatedRevenue += totalAmount;
      }
    }

    // 9. Identify potential issues
    const issues = [];

    // Check for eligible customers without readings (need auto-generation)
    const eligibleWithoutReadings = totalEligibleForGeneration - customersWithReadingsNoBills.length;
    if (eligibleWithoutReadings > 0) {
      issues.push({
        type: 'info',
        message: `${eligibleWithoutReadings} eligible customers don't have meter readings yet (system will auto-generate based on historical consumption)`,
        count: eligibleWithoutReadings
      });
    }

    // Check for categories without tariffs
    const categoriesWithoutTariffs = Object.entries(categoryAnalysis)
      .filter(([_, data]) => !data.hasTariff)
      .map(([category, _]) => category);

    if (categoriesWithoutTariffs.length > 0) {
      issues.push({
        type: 'error',
        message: `No tariffs found for categories: ${categoriesWithoutTariffs.join(', ')}`,
        categories: categoriesWithoutTariffs
      });
    }

    // Check for customers with zero consumption
    const zeroConsumptionCustomers = customersWithReadingsNoBills.filter(
      c => parseFloat(c.unitsConsumed || '0') === 0
    );

    if (zeroConsumptionCustomers.length > 0) {
      issues.push({
        type: 'info',
        message: `${zeroConsumptionCustomers.length} eligible customers have zero consumption (will be charged fixed charges only)`,
        count: zeroConsumptionCustomers.length
      });
    }

    const preview = {
      billingMonth,
      summary: {
        totalActiveCustomers: totalActiveCustomers.count,
        customersWithReadings: customersWithReadingsNoBills.length, // Eligible WITH readings
        customersWithoutReadings: eligibleWithoutReadings, // Eligible WITHOUT readings
        customersWithExistingBills: totalExistingBills,
        eligibleForGeneration: totalEligibleForGeneration, // All active customers without bills
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100 // Note: Only includes customers WITH readings
      },
      existingBills: {
        total: totalExistingBills,
        totalAmount: Math.round(totalBillAmount * 100) / 100,
        byStatus: billsByStatus,
        statusCounts: {
          pending: billsByStatus['pending']?.length || 0,
          // Combine 'generated' and 'issued' bills - both are unpaid bills ready for payment
          issued: (billsByStatus['issued']?.length || 0) + (billsByStatus['generated']?.length || 0),
          paid: billsByStatus['paid']?.length || 0,
          overdue: billsByStatus['overdue']?.length || 0,
          cancelled: billsByStatus['cancelled']?.length || 0
        },
        details: existingBills.slice(0, 10) // First 10 for preview
      },
      categoryBreakdown: categoryAnalysis,
      issues,
      eligibleCustomers: customersWithReadingsNoBills.slice(0, 10), // First 10 for preview
      availableTariffs: availableTariffs.map(t => ({
        id: t.id,
        category: t.category,
        effectiveDate: t.effectiveDate,
        validUntil: t.validUntil
      }))
    };

    console.log('[Bills Preview] Analysis complete:', preview.summary);

    return NextResponse.json({
      success: true,
      data: preview
    });

  } catch (error) {
    console.error('[Bills Preview] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

