import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { outages } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outageId = parseInt(params.id);
    if (isNaN(outageId)) {
      return NextResponse.json({ error: 'Invalid outage ID' }, { status: 400 });
    }

    const [outage] = await db
      .select()
      .from(outages)
      .where(eq(outages.id, outageId));

    if (!outage) {
      return NextResponse.json({ error: 'Outage not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: outage
    });

  } catch (error: any) {
    console.error('[Outage API] Error fetching outage:', error);
    return NextResponse.json({
      error: 'Failed to fetch outage',
      details: error.message
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update outages
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const outageId = parseInt(params.id);
    if (isNaN(outageId)) {
      return NextResponse.json({ error: 'Invalid outage ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      status,
      actualStartTime,
      actualEndTime,
      restorationNotes
    } = body;

    // Check if outage exists
    const [existingOutage] = await db
      .select()
      .from(outages)
      .where(eq(outages.id, outageId));

    if (!existingOutage) {
      return NextResponse.json({ error: 'Outage not found' }, { status: 404 });
    }

    // Update outage
    const updateData: any = {};
    if (status) updateData.status = status;
    if (actualStartTime) updateData.actualStartTime = new Date(actualStartTime);
    if (actualEndTime) updateData.actualEndTime = new Date(actualEndTime);
    if (restorationNotes) updateData.restorationNotes = restorationNotes;

    await db
      .update(outages)
      .set(updateData)
      .where(eq(outages.id, outageId));

    return NextResponse.json({
      success: true,
      message: 'Outage updated successfully'
    });

  } catch (error: any) {
    console.error('[Outage API] Error updating outage:', error);
    return NextResponse.json({
      error: 'Failed to update outage',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete outages
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const outageId = parseInt(params.id);
    if (isNaN(outageId)) {
      return NextResponse.json({ error: 'Invalid outage ID' }, { status: 400 });
    }

    await db
      .delete(outages)
      .where(eq(outages.id, outageId));

    return NextResponse.json({
      success: true,
      message: 'Outage deleted successfully'
    });

  } catch (error: any) {
    console.error('[Outage API] Error deleting outage:', error);
    return NextResponse.json({
      error: 'Failed to delete outage',
      details: error.message
    }, { status: 500 });
  }
}
