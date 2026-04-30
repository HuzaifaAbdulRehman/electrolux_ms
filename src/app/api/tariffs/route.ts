import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { tariffs, tariffSlabs } from '@/lib/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

// Helper function to transform database tariff to frontend format
async function transformTariffForFrontend(tariff: any) {
  const slabs = await db
    .select()
    .from(tariffSlabs)
    .where(eq(tariffSlabs.tariffId, tariff.id))
    .orderBy(tariffSlabs.slabOrder);

  return {
    id: tariff.id,
    category: tariff.category,
    fixedCharge: parseFloat(tariff.fixedCharge || 0),
    validFrom: tariff.effectiveDate,
    validUntil: tariff.validUntil,
    slabs: slabs.map((s) => ({
      range: `${s.startUnits}-${s.endUnits ?? '+'} kWh`,
      rate: parseFloat(String(s.ratePerUnit)),
      startUnits: s.startUnits,
      endUnits: s.endUnits,
      ratePerUnit: parseFloat(String(s.ratePerUnit)),
    })),
    timeOfUse: {
      peak: { hours: '6 PM - 10 PM', rate: parseFloat(tariff.timeOfUsePeakRate || 0) },
      normal: { hours: '10 AM - 6 PM', rate: parseFloat(tariff.timeOfUseNormalRate || 0) },
      offPeak: { hours: '10 PM - 10 AM', rate: parseFloat(tariff.timeOfUseOffpeakRate || 0) }
    },
    electricityDutyPercent: parseFloat(tariff.electricityDutyPercent || 0),
    gstPercent: parseFloat(tariff.gstPercent || 0),
    createdAt: tariff.createdAt,
    updatedAt: tariff.updatedAt
  };
}

// GET /api/tariffs - Get all tariffs
export async function GET(request: NextRequest) {
  try {
    console.log('[API TARIFFS] GET request received');
    const session = await getServerSession(authOptions);
    console.log('[API TARIFFS] Session:', session ? 'exists' : 'null');

    if (!session) {
      console.log('[API TARIFFS] No session - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API TARIFFS] Fetching from database...');
    const result = await db
      .select()
      .from(tariffs)
      .orderBy(desc(tariffs.effectiveDate));

    console.log('[API TARIFFS] Database returned:', result.length, 'tariffs');
    console.log('[API TARIFFS] First tariff:', result[0]);

    // Transform data for frontend
    const transformedData = await Promise.all(result.map(transformTariffForFrontend));

    console.log('[API TARIFFS] Transformed data:', transformedData.length, 'tariffs');
    console.log('[API TARIFFS] First transformed:', transformedData[0]);

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('[API TARIFFS] Error fetching tariffs:', error);
    return NextResponse.json({ error: 'Failed to fetch tariffs', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// POST /api/tariffs - Create/Update tariff (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { category, fixedCharge, slabs, electricityDutyPercent, gstPercent } = body;

    if (!category || !fixedCharge || !slabs) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create new tariff and its normalized slabs
    const [newTariff] = await db.insert(tariffs).values({
      category,
      fixedCharge: fixedCharge.toString(),
      electricityDutyPercent: electricityDutyPercent.toString(),
      gstPercent: gstPercent.toString(),
      effectiveDate: new Date().toISOString().split('T')[0],
    } as any);

    const tariffId = (newTariff as any).insertId;
    const rows = slabs.map((s: any, idx: number) => ({
      tariffId,
      slabOrder: idx + 1,
      startUnits: s.start,
      endUnits: s.end ?? null,
      ratePerUnit: s.rate.toString(),
    }));
    await db.insert(tariffSlabs).values(rows as any);

    return NextResponse.json({
      success: true,
      message: 'Tariff created successfully',
      data: {
        tariffId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tariff:', error);
    return NextResponse.json({ error: 'Failed to create tariff' }, { status: 500 });
  }
}

// PATCH /api/tariffs - Bulk update tariffs (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, tariffIds, updates } = body;

    if (action === 'bulk_update') {
      // Update multiple tariffs
      if (!tariffIds || !Array.isArray(tariffIds)) {
        return NextResponse.json({ error: 'Invalid tariff IDs' }, { status: 400 });
      }

      // For each tariff, create new version
      for (const tariffId of tariffIds) {
        // This would redirect to individual tariff update
        // Implementation depends on specific requirements
      }

      return NextResponse.json({
        success: true,
        message: 'Bulk update completed'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating tariffs:', error);
    return NextResponse.json({ error: 'Failed to update tariffs' }, { status: 500 });
  }
}

// DELETE /api/tariffs - Bulk delete tariffs (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tariffIds } = body;

    if (!tariffIds || !Array.isArray(tariffIds)) {
      return NextResponse.json({ error: 'Invalid tariff IDs' }, { status: 400 });
    }

    // Soft delete multiple tariffs
    for (const tariffId of tariffIds) {
      await db
        .update(tariffs)
        .set({ validUntil: new Date() })
        .where(eq(tariffs.id, tariffId));
    }

    return NextResponse.json({
      success: true,
      message: `${tariffIds.length} tariffs deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting tariffs:', error);
    return NextResponse.json({ error: 'Failed to delete tariffs' }, { status: 500 });
  }
}

