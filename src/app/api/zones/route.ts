import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, outages } from '@/lib/drizzle/schema';
import { sql, inArray } from 'drizzle-orm';

// GET /api/zones
// Returns distinct zones from customers table (primary source)
// Query params:
//   source=outages -> fetch from outages table instead
//   onlyActive=true -> (with source=outages) restrict to zones with scheduled or ongoing outages
//
// SECURITY NOTE: This endpoint is intentionally PUBLIC to support the
// public connection application form (/apply-connection). Zone names are
// not considered sensitive information as they're geographical divisions.
// If rate limiting is needed, implement at the middleware level.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'customers';
    const onlyActive = searchParams.get('onlyActive') === 'true';

    // No authentication required - this endpoint is public by design
    // Used by: /apply-connection (public), /admin/customers, /admin/connection-requests

    let zones: string[] = [];

    if (source === 'outages') {
      // Fetch from outages table (for outage management features)
      let statusFilter: string[] | null = null;
      if (onlyActive) {
        statusFilter = ['scheduled', 'ongoing'];
      }

      const rows = await db
        .select({ zone: outages.zone })
        .from(outages)
        .where(
          statusFilter
            ? inArray(outages.status as any, statusFilter as any)
            : undefined
        )
        .groupBy(outages.zone)
        .orderBy(sql`LOWER(${outages.zone})`);

      zones = rows
        .map(r => r.zone)
        .filter((z): z is string => Boolean(z));
    } else {
      // Fetch from customers table (default - most reliable source)
      const rows = await db
        .select({ zone: customers.zone })
        .from(customers)
        .groupBy(customers.zone)
        .orderBy(sql`LOWER(${customers.zone})`);

      zones = rows
        .map(r => r.zone)
        .filter((z): z is string => Boolean(z));
    }

    // If no zones found, return default zones
    if (zones.length === 0) {
      zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
    }

    return NextResponse.json({ success: true, data: zones });
  } catch (error: any) {
    console.error('Error fetching zones:', error);
    // Return default zones on error
    return NextResponse.json({
      success: true,
      data: ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']
    });
  }
}



