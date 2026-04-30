import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, meterReadings, bills, tariffs, notifications, tariffSlabs } from '@/lib/drizzle/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';


// POST /api/bills/generate-bulk - Generate bills for all eligible customers
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billingMonth } = body;

    if (!billingMonth || !/^\d{4}-\d{2}-01$/.test(billingMonth)) {
      return NextResponse.json({ 
        error: 'Invalid billing month format. Use YYYY-MM-01' 
      }, { status: 400 });
    }

    console.log('[Bulk Generation] Starting bulk bill generation for:', billingMonth);

    const stats = {
      totalProcessed: 0,
      billsGenerated: 0,
      automaticReadings: 0,
      firstReadings: 0, // Track brand new customers with no history
      skipped: {
        noReading: 0,
        alreadyExists: 0,
        noTariff: 0,
        inactive: 0,
        zeroConsumption: 0
      },
      failed: [] as any[],
      generatedBills: [] as any[],
      startTime: new Date(),
      endTime: null as Date | null
    };

    // 1. Fetch all active customers
      const allCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.status, 'active'));

      console.log(`[Bulk Generation] Found ${allCustomers.length} active customers`);

      // 2. Fetch all tariffs (cache to avoid repeated queries)
      const tariffsList = await db
        .select()
        .from(tariffs)
        .where(
          and(
            sql`${tariffs.effectiveDate} <= ${billingMonth}`,
            sql`(${tariffs.validUntil} IS NULL OR ${tariffs.validUntil} >= ${billingMonth})`
          )
        );

      const tariffsMap = new Map(
        tariffsList.map(t => [t.category, t])
      );

      console.log(`[Bulk Generation] Found ${tariffsList.length} active tariffs`);

      // 2b. Prefetch slabs for these tariffs
      const tariffIds = tariffsList.map(t => t.id);
      const allSlabs = tariffIds.length
        ? await db.select().from(tariffSlabs).where(inArray(tariffSlabs.tariffId, tariffIds)).orderBy(tariffSlabs.tariffId, tariffSlabs.slabOrder)
        : [] as any[];
      const slabsByTariff = new Map<number, typeof allSlabs>();
      for (const s of allSlabs) {
        const arr = slabsByTariff.get(s.tariffId) || [];
        arr.push(s);
        slabsByTariff.set(s.tariffId, arr);
      }

      // 3. Process in batches to avoid memory issues
      const BATCH_SIZE = 50;
      const monthStart = new Date(billingMonth);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      for (let i = 0; i < allCustomers.length; i += BATCH_SIZE) {
        const batch = allCustomers.slice(i, i + BATCH_SIZE);
        
        console.log(`[Bulk Generation] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allCustomers.length/BATCH_SIZE)}`);
        
        for (const customer of batch) {
          stats.totalProcessed++;
          
          try {
            // Check if customer is still active
            if (customer.status !== 'active') {
              stats.skipped.inactive++;
              continue;
            }

            // Check if bill already exists for this month
            // Use YEAR/MONTH comparison to handle date format inconsistencies
            const [existingBill] = await db
              .select()
              .from(bills)
              .where(
                and(
                  eq(bills.customerId, customer.id),
                  sql`YEAR(${bills.billingMonth}) = YEAR(${billingMonth}) AND MONTH(${bills.billingMonth}) = MONTH(${billingMonth})`
                )
              )
              .limit(1);

            if (existingBill) {
              stats.skipped.alreadyExists++;
              continue;
            }

            // Get latest meter reading for this month
            let [reading] = await db
              .select()
              .from(meterReadings)
              .where(
                and(
                  eq(meterReadings.customerId, customer.id),
                  sql`${meterReadings.readingDate} >= ${billingMonth}`,
                  sql`${meterReadings.readingDate} < ${monthEndStr}`
                )
              )
              .orderBy(desc(meterReadings.readingDate))
              .limit(1);

            // SCENARIO 3: No reading found - Generate automatic reading
            if (!reading) {
              console.log(`[Bulk Generation] No reading for customer ${customer.accountNumber} - generating automatic reading`);

              try {
                // Get last month's reading to calculate new reading
                const previousMonthDate = new Date(billingMonth);
                previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
                const prevMonthStart = previousMonthDate.toISOString().split('T')[0];
                const prevMonthEnd = new Date(previousMonthDate);
                prevMonthEnd.setMonth(prevMonthEnd.getMonth() + 1);
                const prevMonthEndStr = prevMonthEnd.toISOString().split('T')[0];

                const [lastMonthReading] = await db
                  .select()
                  .from(meterReadings)
                  .where(
                    and(
                      eq(meterReadings.customerId, customer.id),
                      sql`${meterReadings.readingDate} >= ${prevMonthStart}`,
                      sql`${meterReadings.readingDate} < ${prevMonthEndStr}`
                    )
                  )
                  .orderBy(desc(meterReadings.readingDate))
                  .limit(1);

                // EDGE CASE: Brand new customer with NO previous readings at all
                let previousReading = 0;
                let isFirstReading = false;

                if (!lastMonthReading) {
                  // Try to find ANY previous reading (for brand new customers)
                  const [anyPreviousReading] = await db
                    .select()
                    .from(meterReadings)
                    .where(eq(meterReadings.customerId, customer.id))
                    .orderBy(desc(meterReadings.readingDate))
                    .limit(1);

                  if (anyPreviousReading) {
                    // Customer has SOME history (just not last month)
                    previousReading = parseFloat(anyPreviousReading.currentReading);
                    console.log(`[Bulk Generation] Using any available reading: ${previousReading} for ${customer.accountNumber}`);
                  } else {
                    // BRAND NEW CUSTOMER - No readings ever!
                    isFirstReading = true;

                    // Check if customer was just connected this month
                    const connectionDate = new Date(customer.connectionDate || billingMonth);
                    const billingMonthDate = new Date(billingMonth);

                    if (connectionDate >= billingMonthDate) {
                      // Connected THIS month - use minimal initial reading
                      previousReading = 0;
                      console.log(`[Bulk Generation] NEW customer connected this month: ${customer.accountNumber} - Starting from 0`);
                    } else {
                      // Connected before but no readings - use estimated initial reading
                      // Estimate based on months since connection
                      const monthsSinceConnection = Math.floor(
                        (billingMonthDate.getTime() - connectionDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
                      );

                      const defaults: { [key: string]: number } = {
                        'Residential': 200,
                        'Commercial': 800,
                        'Industrial': 8000,
                        'Agricultural': 600
                      };
                      const monthlyDefault = defaults[customer.connectionType || 'Residential'] || 200;
                      previousReading = monthlyDefault * Math.max(1, monthsSinceConnection);

                      console.log(`[Bulk Generation] NEW customer (${monthsSinceConnection} months old): ${customer.accountNumber} - Estimated previous: ${previousReading}`);
                    }
                  }
                } else {
                  previousReading = parseFloat(lastMonthReading.currentReading);
                }

                // Calculate average consumption from historical data
                let averageConsumption = 0;

                // Strategy 1: If has ≥6 months history, use last 6 months average
                const historicalReadings = await db
                  .select()
                  .from(meterReadings)
                  .where(eq(meterReadings.customerId, customer.id))
                  .orderBy(desc(meterReadings.readingDate))
                  .limit(6);

                if (historicalReadings.length >= 6) {
                  const totalConsumption = historicalReadings.reduce((sum, r) =>
                    sum + parseFloat(r.unitsConsumed || '0'), 0
                  );
                  averageConsumption = totalConsumption / historicalReadings.length;
                  console.log(`[Bulk Generation] Using 6-month average: ${averageConsumption.toFixed(2)} kWh`);
                } else if (historicalReadings.length > 0) {
                  // Strategy 2: Use available history average
                  const totalConsumption = historicalReadings.reduce((sum, r) =>
                    sum + parseFloat(r.unitsConsumed || '0'), 0
                  );
                  averageConsumption = totalConsumption / historicalReadings.length;
                  console.log(`[Bulk Generation] Using ${historicalReadings.length}-month average: ${averageConsumption.toFixed(2)} kWh`);
                } else {
                  // Strategy 3: Use category average (fallback)
                  const categoryPeers = await db
                    .select({ unitsConsumed: meterReadings.unitsConsumed })
                    .from(meterReadings)
                    .leftJoin(customers, eq(meterReadings.customerId, customers.id))
                    .where(
                      and(
                        eq(customers.connectionType, customer.connectionType || 'Residential'),
                        sql`${meterReadings.readingDate} >= DATE_SUB(${billingMonth}, INTERVAL 6 MONTH)`
                      )
                    )
                    .limit(100);

                  if (categoryPeers.length > 0) {
                    const totalConsumption = categoryPeers.reduce((sum, r) =>
                      sum + parseFloat(r.unitsConsumed || '0'), 0
                    );
                    averageConsumption = totalConsumption / categoryPeers.length;
                    console.log(`[Bulk Generation] Using category average: ${averageConsumption.toFixed(2)} kWh`);
                  } else {
                    // Strategy 4: Use zone average (final fallback)
                    const zonePeers = await db
                      .select({ unitsConsumed: meterReadings.unitsConsumed })
                      .from(meterReadings)
                      .leftJoin(customers, eq(meterReadings.customerId, customers.id))
                      .where(
                        and(
                          eq(customers.zone, customer.zone || 'Zone A'),
                          sql`${meterReadings.readingDate} >= DATE_SUB(${billingMonth}, INTERVAL 6 MONTH)`
                        )
                      )
                      .limit(100);

                    if (zonePeers.length > 0) {
                      const totalConsumption = zonePeers.reduce((sum, r) =>
                        sum + parseFloat(r.unitsConsumed || '0'), 0
                      );
                      averageConsumption = totalConsumption / zonePeers.length;
                      console.log(`[Bulk Generation] Using zone average: ${averageConsumption.toFixed(2)} kWh`);
                    } else {
                      // Absolute fallback: Use default based on connection type
                      const defaults: { [key: string]: number } = {
                        'Residential': 200,
                        'Commercial': 800,
                        'Industrial': 8000,
                        'Agricultural': 600
                      };
                      averageConsumption = defaults[customer.connectionType || 'Residential'] || 200;
                      console.log(`[Bulk Generation] Using default consumption: ${averageConsumption} kWh`);
                    }
                  }
                }

                // Apply ±15% random variance for realism (unless it's first reading)
                const variance = isFirstReading ? 1.0 : (0.85 + (Math.random() * 0.30)); // No variance for brand new customers
                const newConsumption = Math.round(averageConsumption * variance);

                // Validate consumption is reasonable
                if (newConsumption < 0) {
                  console.warn(`[Bulk Generation] Negative consumption calculated for ${customer.accountNumber}, using 0`);
                  throw new Error('Invalid consumption calculated');
                }

                // Calculate new reading (previousReading already calculated above)
                const newReading = previousReading + newConsumption;

                console.log(`[Bulk Generation] ${isFirstReading ? 'FIRST' : 'Auto'} reading for ${customer.accountNumber}: prev=${previousReading}, consumed=${newConsumption}, new=${newReading}`);

                // Insert automatic meter reading
                const readingDate = new Date(billingMonth);
                readingDate.setDate(15); // Mid-month reading
                const readingDateStr = readingDate.toISOString().split('T')[0];

                const readingInsertResult = await db.insert(meterReadings).values({
                  customerId: customer.id,
                  meterNumber: customer.meterNumber,
                  currentReading: newReading.toString(),
                  previousReading: previousReading.toString(),
                  unitsConsumed: newConsumption.toString(),
                  readingDate: readingDateStr,
                  readingTime: readingDate,
                  meterCondition: 'good',
                  accessibility: 'accessible',
                  employeeId: 1, // Admin/System generated
                  photoPath: null,
                  notes: isFirstReading
                    ? `First reading - Auto-generated for new customer (${customer.connectionType}). Based on connection type defaults.`
                    : `Auto-generated by bulk bill generation system using ${historicalReadings.length > 0 ? historicalReadings.length + '-month' : 'category'} average consumption.`,
                } as any);

                const readingId = (readingInsertResult as any).insertId;
                console.log(`[Bulk Generation] Created ${isFirstReading ? 'FIRST' : 'automatic'} reading for ${customer.accountNumber}: ${newConsumption} kWh (variance: ${(variance * 100).toFixed(1)}%)`);
                stats.automaticReadings++;
                if (isFirstReading) {
                  stats.firstReadings++;
                }

                // Fetch the newly created reading
                [reading] = await db
                  .select()
                  .from(meterReadings)
                  .where(eq(meterReadings.id, readingId))
                  .limit(1);

              } catch (autoReadingError: any) {
                console.error(`[Bulk Generation] Error generating automatic reading for ${customer.accountNumber}:`, autoReadingError);
                stats.skipped.noReading++;
                stats.failed.push({
                  customerId: customer.id,
                  accountNumber: customer.accountNumber,
                  fullName: customer.fullName,
                  error: `Failed to generate automatic reading: ${autoReadingError.message}`
                });
                continue;
              }
            }

            // Check for zero consumption
            const unitsConsumed = parseFloat(reading.unitsConsumed || '0');
            if (unitsConsumed === 0) {
              stats.skipped.zeroConsumption++;
              // Still generate bill for zero consumption (fixed charges only)
            }

            // Get tariff for customer category
            const customerCategory = customer.connectionType || 'Residential';
            const tariff = tariffsMap.get(customerCategory);

            if (!tariff) {
              stats.skipped.noTariff++;
              stats.failed.push({
                customerId: customer.id,
                accountNumber: customer.accountNumber,
                fullName: customer.fullName,
                error: `No tariff found for category: ${customerCategory}`
              });
              continue;
            }

            // Calculate bill charges using slab-based calculation
            const tariffSlabRows = slabsByTariff.get(tariff.id) || [];
            const billCalculation = calculateBillCharges(unitsConsumed, tariff, tariffSlabRows);
            
            // Generate unique bill number
            const billNumber = generateBillNumber();
            const issueDate = new Date().toISOString().split('T')[0];
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 15);

            // Insert bill into database
            const billInsertResult = await db.insert(bills).values({
              customerId: customer.id,
              billNumber,
              billingMonth,
              issueDate,
              dueDate: dueDate.toISOString().split('T')[0],
              unitsConsumed: unitsConsumed.toFixed(2),
              meterReadingId: reading.id,
              baseAmount: billCalculation.baseAmount.toFixed(2),
              fixedCharges: billCalculation.fixedCharges.toFixed(2),
              electricityDuty: billCalculation.electricityDuty.toFixed(2),
              gstAmount: billCalculation.gstAmount.toFixed(2),
              totalAmount: billCalculation.totalAmount.toFixed(2),
              status: 'issued', // Bulk bills are auto-issued
              tariffId: tariff.id,
            } as any);

            const billId = (billInsertResult as any).insertId;

            // Update customer's outstanding balance
            const newOutstandingBalance = parseFloat(customer.outstandingBalance || '0') + billCalculation.totalAmount;
            await db
              .update(customers)
              .set({
                outstandingBalance: newOutstandingBalance.toFixed(2),
                lastBillAmount: billCalculation.totalAmount.toFixed(2),
              })
              .where(eq(customers.id, customer.id));

            // Send notification to customer (async, don't wait)
            if (customer.userId) {
              db.insert(notifications).values({
                userId: customer.userId,
                notificationType: 'billing',
                title: 'New Bill Generated',
                message: `Your bill for ${billingMonth} is ready. Amount: Rs ${billCalculation.totalAmount.toFixed(2)}. Due date: ${dueDate.toLocaleDateString()}`,
                priority: 'high',
                actionUrl: '/customer/view-bills',
                actionText: 'View Bill',
                isRead: 0,
              } as any).catch((err) => {
                console.error(`[Bulk Generation] Failed to send notification to customer ${customer.accountNumber}:`, err);
              });
            }

            stats.billsGenerated++;
            stats.generatedBills.push({
              billId: billId,
              customerId: customer.id,
              accountNumber: customer.accountNumber,
              fullName: customer.fullName,
              amount: billCalculation.totalAmount,
              unitsConsumed: unitsConsumed
            });

            console.log(`[Bulk Generation] Generated bill for ${customer.accountNumber}: Rs ${billCalculation.totalAmount.toFixed(2)}`);

          } catch (error: any) {
            console.error(`[Bulk Generation] Error processing customer ${customer.accountNumber}:`, error);
            stats.failed.push({
              customerId: customer.id,
              accountNumber: customer.accountNumber,
              fullName: customer.fullName,
              error: error.message
            });
          }
        }
        
        // Yield control to event loop between batches
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      stats.endTime = new Date();
      const duration = stats.endTime.getTime() - stats.startTime.getTime();

      console.log('[Bulk Generation] Complete:', {
        duration: `${(duration / 1000).toFixed(2)}s`,
        stats
      });

      return NextResponse.json({
        success: true,
        message: `Bulk bill generation completed in ${(duration / 1000).toFixed(2)}s`,
        summary: {
          totalProcessed: stats.totalProcessed,
          billsGenerated: stats.billsGenerated,
          automaticReadingsGenerated: stats.automaticReadings,
          billingMonth,
          skipped: stats.skipped,
          failedCount: stats.failed.length,
          duration: `${(duration / 1000).toFixed(2)}s`,
          averageTimePerBill: stats.billsGenerated > 0 ? `${(duration / stats.billsGenerated).toFixed(2)}ms` : 'N/A'
        },
        generatedBills: stats.generatedBills.slice(0, 20), // First 20 bills
        failed: stats.failed.slice(0, 10) // First 10 failures
    });

  } catch (error: any) {
    console.error('[Bulk Generation] Request error:', error);
    return NextResponse.json({
      error: 'Failed to process bulk generation request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function: Calculate bill charges using slab-based pricing
function calculateBillCharges(unitsConsumed: number, tariff: any, slabs: Array<{ startUnits: number | null; endUnits: number | null; ratePerUnit: any }>) {
  // Validate slabs exist
  if (!slabs || slabs.length === 0) {
    throw new Error('No tariff slabs provided for calculation');
  }

  let baseAmount = 0;
  let remaining = unitsConsumed;

  for (const s of slabs) {
    if (remaining <= 0) break;

    const start = s.startUnits ?? 0;
    const end = s.endUnits;
    const rate = parseFloat(String(s.ratePerUnit));

    // Validate rate
    if (isNaN(rate) || rate < 0) {
      throw new Error(`Invalid rate: ${s.ratePerUnit}`);
    }

    // Calculate slab span: if end is null, it's unbounded (use all remaining units)
    const span = end === null ? remaining : (end - start + 1);
    const used = Math.min(remaining, span);

    baseAmount += used * rate;
    remaining -= used;
  }

  // Round baseAmount to whole number (no decimal paisa)
  baseAmount = Math.round(baseAmount);

  const fixedCharges = Math.round(parseFloat(tariff.fixedCharge));
  const electricityDuty = Math.round(baseAmount * (parseFloat(tariff.electricityDutyPercent) / 100));
  const gstAmount = Math.round((baseAmount + fixedCharges + electricityDuty) * (parseFloat(tariff.gstPercent) / 100));
  const totalAmount = Math.round(baseAmount + fixedCharges + electricityDuty + gstAmount);

  return {
    baseAmount,
    fixedCharges,
    electricityDuty,
    gstAmount,
    totalAmount
  };
}

// Helper function: Generate unique bill number
function generateBillNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `BILL-${year}-${random}`;
}

