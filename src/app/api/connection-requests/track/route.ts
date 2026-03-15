import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle/db';
import { connectionRequests } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

// GET /api/connection-requests/track?applicationNumber=XXX
// Public endpoint - no authentication required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationNumber = searchParams.get('applicationNumber');

    if (!applicationNumber) {
      return NextResponse.json(
        { success: false, error: 'Application number is required' },
        { status: 400 }
      );
    }

    // Fetch connection request by application number
    const [application] = await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.applicationNumber, applicationNumber))
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found. Please check your application number.' },
        { status: 404 }
      );
    }

    // Return application details
    // Note: temporaryPassword and accountNumber are only available when status is approved/connected
    return NextResponse.json({
      success: true,
      data: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        applicantName: application.applicantName,
        email: application.email,
        phone: application.phone,
        propertyType: application.propertyType,
        connectionType: application.connectionType,
        propertyAddress: application.propertyAddress,
        city: application.city,
        state: application.state,
        pincode: application.pincode,
        status: application.status,
        applicationDate: application.applicationDate,
        approvalDate: application.approvalDate,
        inspectionDate: application.inspectionDate,
        installationDate: application.installationDate,
        // These fields only available when approved
        accountNumber: application.accountNumber || null,
        temporaryPassword: application.temporaryPassword || null,
      }
    });

  } catch (error) {
    console.error('Error tracking application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch application details' },
      { status: 500 }
    );
  }
}

