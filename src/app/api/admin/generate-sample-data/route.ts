import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { users, customers, meterReadings, bills, workOrders } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can generate sample data
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { count, dataType } = body;

    if (!count || count < 1 || count > 100) {
      return NextResponse.json({
        error: 'Invalid count. Must be between 1 and 100'
      }, { status: 400 });
    }

    console.log(`[Sample Data] Generating ${count} ${dataType} records...`);

    let generatedCount = 0;

    // Generate sample data based on type (DBMS: Bulk Insert Operations)
    switch (dataType) {
      case 'users':
        const userData = Array.from({ length: count }, () => ({
          email: faker.internet.email(),
          password: 'password123', // In production, this should be hashed
          userType: faker.helpers.arrayElement(['customer', 'employee', 'admin'] as const),
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          isActive: 1
        }));

        await db.insert(users).values(userData);
        generatedCount = userData.length;
        break;

      case 'customers':
        // First get some user IDs to use as foreign keys
        const existingUsers = await db.select({ id: users.id }).from(users).limit(10);
        if (existingUsers.length === 0) {
          return NextResponse.json({
            error: 'No users found. Please generate users first.'
          }, { status: 400 });
        }

        const customerData = Array.from({ length: count }, () => ({
          userId: faker.helpers.arrayElement(existingUsers).id,
          accountNumber: `ELX-2024-${faker.string.numeric(6)}`,
          meterNumber: `MTR-${faker.string.alpha(3).toUpperCase()}-${faker.string.numeric(6)}`,
          fullName: faker.person.fullName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          pincode: faker.location.zipCode(),
          connectionType: faker.helpers.arrayElement(['Residential', 'Commercial', 'Industrial', 'Agricultural'] as const),
          status: faker.helpers.arrayElement(['active', 'pending_installation', 'suspended', 'inactive'] as const),
          connectionDate: faker.date.past({ years: 2 }),
          averageMonthlyUsage: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }).toString()
        }));
        
        await db.insert(customers).values(customerData);
        generatedCount = customerData.length;
        break;

      case 'meter_readings':
        // Get some customer IDs
        const existingCustomers = await db.select({ id: customers.id }).from(customers).limit(20);
        if (existingCustomers.length === 0) {
          return NextResponse.json({
            error: 'No customers found. Please generate customers first.'
          }, { status: 400 });
        }

        const readingData = Array.from({ length: count }, () => {
          const customerId = faker.helpers.arrayElement(existingCustomers).id;
          const previousReading = faker.number.int({ min: 1000, max: 5000 });
          const currentReading = previousReading + faker.number.int({ min: 50, max: 500 });
          const readingDateTime = faker.date.recent({ refDate: new Date() });

          return {
            customerId,
            meterNumber: `MTR-${faker.string.alpha(3).toUpperCase()}-${faker.string.numeric(6)}`,
            readingDate: readingDateTime,
            readingTime: readingDateTime,
            currentReading: currentReading.toString(),
            previousReading: previousReading.toString(),
            unitsConsumed: (currentReading - previousReading).toString()
          };
        });
        
        await db.insert(meterReadings).values(readingData);
        generatedCount = readingData.length;
        break;

      case 'bills':
        // Get some customer IDs and meter readings
        const customersForBills = await db.select({ id: customers.id }).from(customers).limit(20);
        if (customersForBills.length === 0) {
          return NextResponse.json({
            error: 'No customers found. Please generate customers first.'
          }, { status: 400 });
        }

        const billData = Array.from({ length: count }, () => {
          const customerId = faker.helpers.arrayElement(customersForBills).id;
          const totalAmount = faker.number.float({ min: 50, max: 1000, fractionDigits: 2 });
          
          const billDate = faker.date.recent({ refDate: new Date() });
          const dueDate = new Date(billDate);
          dueDate.setDate(dueDate.getDate() + 30);
          const unitsConsumed = faker.number.int({ min: 50, max: 500 });
          const baseAmount = faker.number.float({ min: 30, max: 800, fractionDigits: 2 });

          return {
            customerId,
            billNumber: `BILL-${faker.string.numeric(8)}`,
            billingMonth: billDate,
            issueDate: billDate,
            dueDate: dueDate,
            unitsConsumed: unitsConsumed.toString(),
            baseAmount: baseAmount.toString(),
            fixedCharges: '50.00',
            totalAmount: totalAmount.toString(),
            status: faker.helpers.arrayElement(['generated', 'issued', 'paid', 'overdue'] as const)
          };
        });
        
        await db.insert(bills).values(billData);
        generatedCount = billData.length;
        break;

      case 'work_orders':
        // Get some customer and employee IDs
        const customersForWork = await db.select({ id: customers.id }).from(customers).limit(10);
        const employeesForWork = await db.select({ id: users.id }).from(users).where(eq(users.userType, 'employee')).limit(5);
        
        if (customersForWork.length === 0 || employeesForWork.length === 0) {
          return NextResponse.json({
            error: 'No customers or employees found. Please generate them first.'
          }, { status: 400 });
        }

        const workOrderData = Array.from({ length: count }, () => {
          const assignedDate = faker.date.recent({ refDate: new Date() });
          const dueDate = new Date(assignedDate);
          dueDate.setDate(dueDate.getDate() + 7);

          return {
            employeeId: faker.helpers.arrayElement(employeesForWork).id,
            customerId: faker.helpers.arrayElement(customersForWork).id,
            workType: faker.helpers.arrayElement(['meter_reading', 'maintenance', 'complaint_resolution', 'new_connection'] as const),
            title: faker.lorem.sentence(4),
            description: faker.lorem.paragraph(),
            status: faker.helpers.arrayElement(['assigned', 'in_progress', 'completed'] as const),
            priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent'] as const),
            assignedDate,
            dueDate
          };
        });
        
        await db.insert(workOrders).values(workOrderData);
        generatedCount = workOrderData.length;
        break;

      default:
        return NextResponse.json({
          error: 'Invalid data type'
        }, { status: 400 });
    }

    console.log(`[Sample Data] Successfully generated ${generatedCount} ${dataType} records`);

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${generatedCount} ${dataType} records`,
      data: {
        type: dataType,
        count: generatedCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Sample Data] Error generating sample data:', error);
    return NextResponse.json({
      error: 'Failed to generate sample data',
      details: error.message
    }, { status: 500 });
  }
}

