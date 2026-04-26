import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { customers, users, bills, meterReadings, workOrders, employees, tariffs } from '@/lib/drizzle/schema';
import { eq, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can export data
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const format = searchParams.get('format') || 'csv';

    console.log('[Data Export] Exporting data:', { type, format });

    let data: any[] = [];
    let filename = '';

    // Fetch data based on type (DBMS: Dynamic Query Building)
    switch (type) {
      case 'users':
        data = await db.select().from(users);
        filename = 'users';
        break;

      case 'customers':
        data = await db
          .select({
            id: customers.id,
            accountNumber: customers.accountNumber,
            meterNumber: customers.meterNumber,
            fullName: customers.fullName,
            phone: customers.phone,
            address: customers.address,
            city: customers.city,
            state: customers.state,
            connectionType: customers.connectionType,
            status: customers.status,
            averageMonthlyUsage: customers.averageMonthlyUsage,
            createdAt: customers.createdAt
          })
          .from(customers);
        filename = 'customers';
        break;

      case 'meter_readings':
        data = await db
          .select({
            id: meterReadings.id,
            customerId: meterReadings.customerId,
            readingDate: meterReadings.readingDate,
            currentReading: meterReadings.currentReading,
            previousReading: meterReadings.previousReading,
            unitsConsumed: meterReadings.unitsConsumed,
            createdAt: meterReadings.createdAt
          })
          .from(meterReadings)
          .orderBy(desc(meterReadings.readingDate));
        filename = 'meter_readings';
        break;

      case 'bills':
        data = await db
          .select({
            id: bills.id,
            billNumber: bills.billNumber,
            customerId: bills.customerId,
            billingMonth: bills.billingMonth,
            totalAmount: bills.totalAmount,
            status: bills.status,
            dueDate: bills.dueDate,
            createdAt: bills.createdAt
          })
          .from(bills)
          .orderBy(desc(bills.createdAt));
        filename = 'bills';
        break;

      case 'work_orders':
        data = await db
          .select({
            id: workOrders.id,
            employeeId: workOrders.employeeId,
            customerId: workOrders.customerId,
            workType: workOrders.workType,
            title: workOrders.title,
            description: workOrders.description,
            status: workOrders.status,
            priority: workOrders.priority,
            assignedDate: workOrders.assignedDate,
            dueDate: workOrders.dueDate,
            completionDate: workOrders.completionDate,
            createdAt: workOrders.createdAt
          })
          .from(workOrders)
          .orderBy(desc(workOrders.createdAt));
        filename = 'work_orders';
        break;

      case 'employees':
        data = await db
          .select({
            id: employees.id,
              employeeName: employees.employeeName,
            email: employees.email,
            phone: employees.phone,
            department: employees.department,
              designation: employees.designation,
              assignedZone: employees.assignedZone,
            status: employees.status,
              hireDate: employees.hireDate,
            createdAt: employees.createdAt
          })
          .from(employees);
        filename = 'employees';
        break;

      case 'tariffs':
        data = await db
          .select({
            id: tariffs.id,
            category: tariffs.category,
            fixedCharge: tariffs.fixedCharge,
            electricityDutyPercent: tariffs.electricityDutyPercent,
            gstPercent: tariffs.gstPercent,
            effectiveDate: tariffs.effectiveDate,
            validUntil: tariffs.validUntil,
            createdAt: tariffs.createdAt
          })
          .from(tariffs);
        filename = 'tariffs';
        break;

      default:
        return NextResponse.json({
          error: 'Invalid data type'
        }, { status: 400 });
    }

    console.log(`[Data Export] Fetched ${data.length} records for ${type}`);

    // Convert to requested format (DBMS: Data Transformation)
    let content: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    } else {
      // CSV format
      if (data.length === 0) {
        content = 'No data available';
      } else {
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              // Escape CSV values
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ];
        content = csvRows.join('\n');
      }
      mimeType = 'text/csv';
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}_export.${format}"`,
      },
    });

  } catch (error: any) {
    console.error('[Data Export] Error exporting data:', error);
    return NextResponse.json({
      error: 'Failed to export data',
      details: error.message
    }, { status: 500 });
  }
}

