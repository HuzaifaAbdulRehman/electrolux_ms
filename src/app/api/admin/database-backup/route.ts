import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { 
  customers, 
  users, 
  bills, 
  meterReadings, 
  workOrders, 
  employees, 
  tariffs,
  payments,
  connectionRequests
} from '@/lib/drizzle/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create backups
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('[Database Backup] Creating full database backup...');

    // Fetch all data from all tables (DBMS: Complete Data Export)
    const [
      usersData,
      customersData,
      employeesData,
      tariffsData,
      meterReadingsData,
      billsData,
      paymentsData,
      workOrdersData,
      connectionRequestsData
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(customers),
      db.select().from(employees),
      db.select().from(tariffs),
      db.select().from(meterReadings),
      db.select().from(bills),
      db.select().from(payments),
      db.select().from(workOrders),
      db.select().from(connectionRequests)
    ]);

    // Create backup structure (DBMS: Data Organization)
    const backupData = {
      metadata: {
        backupDate: new Date().toISOString(),
        version: '1.0',
        createdBy: session.user.email,
        recordCounts: {
          users: usersData.length,
          customers: customersData.length,
          employees: employeesData.length,
          tariffs: tariffsData.length,
          meterReadings: meterReadingsData.length,
          bills: billsData.length,
          payments: paymentsData.length,
          workOrders: workOrdersData.length,
          connectionRequests: connectionRequestsData.length
        }
      },
      data: {
        users: usersData,
        customers: customersData,
        employees: employeesData,
        tariffs: tariffsData,
        meterReadings: meterReadingsData,
        bills: billsData,
        payments: paymentsData,
        workOrders: workOrdersData,
        connectionRequests: connectionRequestsData
      }
    };

    const totalRecords = Object.values(backupData.metadata.recordCounts).reduce((sum, count) => sum + count, 0);

    console.log(`[Database Backup] Backup created successfully: ${totalRecords} total records`);

    return NextResponse.json({
      success: true,
      message: 'Database backup created successfully',
      data: backupData,
      metadata: {
        totalRecords,
        backupSize: JSON.stringify(backupData).length,
        tables: Object.keys(backupData.metadata.recordCounts).length
      }
    });

  } catch (error: any) {
    console.error('[Database Backup] Error creating backup:', error);
    return NextResponse.json({
      error: 'Failed to create database backup',
      details: error.message
    }, { status: 500 });
  }
}

