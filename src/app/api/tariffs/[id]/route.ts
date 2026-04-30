import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { tariffs, tariffSlabs } from '@/lib/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// GET /api/tariffs/[id] - Get single tariff with slabs
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tariffId = parseInt(params.id);
    if (isNaN(tariffId)) {
      return NextResponse.json({ error: 'Invalid tariff ID' }, { status: 400 });
    }

    // Get tariff details
    const [tariff] = await db
      .select()
      .from(tariffs)
      .where(eq(tariffs.id, tariffId))
      .limit(1);

    if (!tariff) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    // Load normalized slabs
    const slabs = await db
      .select()
      .from(tariffSlabs)
      .where(eq(tariffSlabs.tariffId, tariff.id))
      .orderBy(tariffSlabs.slabOrder);

    const transformedTariff = {
      id: tariff.id,
      category: tariff.category,
      fixedCharge: parseFloat(tariff.fixedCharge || '0'),
      validFrom: tariff.effectiveDate,
      validUntil: tariff.validUntil,
      slabs: slabs.map(s => ({
        range: `${s.startUnits}-${s.endUnits ?? '+'} kWh`,
        rate: parseFloat(String(s.ratePerUnit)),
        startUnits: s.startUnits,
        endUnits: s.endUnits,
        ratePerUnit: parseFloat(String(s.ratePerUnit))
      })),
      timeOfUse: {
        peak: { hours: '6 PM - 10 PM', rate: parseFloat(tariff.timeOfUsePeakRate || '0') },
        normal: { hours: '10 AM - 6 PM', rate: parseFloat(tariff.timeOfUseNormalRate || '0') },
        offPeak: { hours: '10 PM - 10 AM', rate: parseFloat(tariff.timeOfUseOffpeakRate || '0') }
      },
      electricityDutyPercent: parseFloat(tariff.electricityDutyPercent || '0'),
      gstPercent: parseFloat(tariff.gstPercent || '0'),
    };

    return NextResponse.json({
      success: true,
      data: transformedTariff
    });

  } catch (error) {
    console.error('Error fetching tariff:', error);
    return NextResponse.json({
      error: 'Failed to fetch tariff',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH /api/tariffs/[id] - Update tariff (create new version)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tariffId = parseInt(params.id);
    if (isNaN(tariffId)) {
      return NextResponse.json({ error: 'Invalid tariff ID' }, { status: 400 });
    }

    const body = await request.json();
    console.log('[TARIFF UPDATE] Received request body:', JSON.stringify(body, null, 2));
    
    const { 
      category, 
      fixedCharge, 
      effectiveDate, 
      validUntil,
      slabs,
      electricityDutyPercent,
      gstPercent,
      timeOfUsePeakRate,
      timeOfUseNormalRate,
      timeOfUseOffpeakRate
    } = body;

    // Validate required fields
    if (!category || !fixedCharge || !effectiveDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: category, fixedCharge, effectiveDate' 
      }, { status: 400 });
    }

    // Validate slabs array
    console.log('[TARIFF UPDATE] Validating slabs:', slabs);
    if (!slabs || !Array.isArray(slabs) || slabs.length < 5) {
      console.log('[TARIFF UPDATE] Slabs validation failed:', { slabs, isArray: Array.isArray(slabs), length: slabs?.length });
      return NextResponse.json({ 
        error: 'Invalid slabs data: must be an array with 5 slab objects' 
      }, { status: 400 });
    }

    // Check if tariff exists
    const [existingTariff] = await db
      .select()
      .from(tariffs)
      .where(eq(tariffs.id, tariffId))
      .limit(1);

    if (!existingTariff) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    // For DBMS project: Create new version instead of updating existing
    // This maintains audit trail and prevents breaking existing bills

    // Format date to MySQL DATE format (YYYY-MM-DD)
    const formattedEffectiveDate = new Date(effectiveDate).toISOString().split('T')[0];

    const newTariffData: any = {
      // DO NOT include 'id' - it's AUTO_INCREMENT!
      category,
      fixedCharge: fixedCharge.toString(),
      effectiveDate: formattedEffectiveDate, // MySQL DATE format
      validUntil: validUntil ? new Date(validUntil).toISOString().split('T')[0] : null,
      electricityDutyPercent: (electricityDutyPercent || 16.0).toString(),
      gstPercent: (gstPercent || 18.0).toString(),
      timeOfUsePeakRate: timeOfUsePeakRate ? timeOfUsePeakRate.toString() : '0.00',
      timeOfUseNormalRate: timeOfUseNormalRate ? timeOfUseNormalRate.toString() : '0.00',
      timeOfUseOffpeakRate: timeOfUseOffpeakRate ? timeOfUseOffpeakRate.toString() : '0.00',
    };

    console.log('[TARIFF UPDATE] Creating new tariff version:', JSON.stringify(newTariffData, null, 2));

    // Insert new tariff version
    let newTariffId: number | null = null;
    try {
      const [insertResult] = await db.insert(tariffs).values(newTariffData as any);
      newTariffId = (insertResult as any).insertId;
      // Insert normalized slabs for new tariff version
      const rows = (slabs as any[]).map((s: any, idx: number) => ({
        tariffId: newTariffId!,
        slabOrder: idx + 1,
        startUnits: s.startUnits,
        endUnits: s.endUnits ?? null,
        ratePerUnit: s.ratePerUnit.toString(),
      }));
      await db.insert(tariffSlabs).values(rows as any);
      console.log('[TARIFF UPDATE] Insert result, newTariffId:', newTariffId);
    } catch (insertError) {
      console.error('[TARIFF UPDATE] INSERT ERROR:', insertError);
      throw insertError;
    }

    console.log('[TARIFF UPDATE] New tariff created successfully');

    // Mark old tariff as expired (soft delete for audit trail)
    await db
      .update(tariffs)
      .set({ validUntil: new Date(effectiveDate) }) // Use Date object
      .where(
        and(
          eq(tariffs.id, tariffId),
          sql`${tariffs.validUntil} IS NULL`
        )
      );

    console.log('[TARIFF UPDATE] Old tariff marked as expired');

    // Get the newly created tariff
    const [newTariff] = await db
      .select()
      .from(tariffs)
      .where(
        and(
          eq(tariffs.category, category),
          sql`${tariffs.validUntil} IS NULL`
        )
      )
      .orderBy(desc(tariffs.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Tariff updated successfully (new version created)',
      data: {
        newTariffId: newTariff?.id || newTariffId,
        oldTariffId: tariffId
      }
    });

  } catch (error) {
    console.error('[TARIFF UPDATE] Error updating tariff:', error);
    console.error('[TARIFF UPDATE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Failed to update tariff',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/tariffs/[id] - Soft delete tariff
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tariffId = parseInt(params.id);
    if (isNaN(tariffId)) {
      return NextResponse.json({ error: 'Invalid tariff ID' }, { status: 400 });
    }

    // Check if tariff exists
    const [tariff] = await db
      .select()
      .from(tariffs)
      .where(eq(tariffs.id, tariffId))
      .limit(1);

    if (!tariff) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    // Check if tariff is currently active (has bills using it)
    const [activeBills] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tariffs)
      .where(
        and(
          eq(tariffs.id, tariffId),
          sql`${tariffs.validUntil} IS NULL`
        )
      );

    if (activeBills.count > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete active tariff. Create a new version first.' 
      }, { status: 400 });
    }

    // Soft delete: Set validUntil to today
    await db
      .update(tariffs)
      .set({ validUntil: new Date() })
      .where(eq(tariffs.id, tariffId));

    return NextResponse.json({
      success: true,
      message: 'Tariff deleted successfully (soft delete)'
    });

  } catch (error) {
    console.error('Error deleting tariff:', error);
    return NextResponse.json({ 
      error: 'Failed to delete tariff',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
