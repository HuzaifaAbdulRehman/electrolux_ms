import { faker } from '@faker-js/faker';
import { db } from './db';
import { users, customers, employees, tariffs, meterReadings, bills, payments, workOrders, notifications, billRequests, outages, tariffSlabs } from './schema';
import bcrypt from 'bcryptjs';
import { subMonths, format, addDays, subDays } from 'date-fns';
import { eq, sql } from 'drizzle-orm';

// Helper function to generate unique account numbers
function generateAccountNumber(index: number): string {
  return `ELX-2024-${String(index).padStart(6, '0')}`;
}

function generateMeterNumber(index: number, cityCode: string): string {
  return `MTR-${cityCode}-${String(index).padStart(6, '0')}`;
}

function generateBillNumber(month: number, customerId: number): string {
  return `BILL-2024-${String(month).padStart(2, '0')}-${String(customerId).padStart(4, '0')}`;
}

function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateReceiptNumber(index: number): string {
  return `RCP-2024-${String(index).padStart(6, '0')}`;
}

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Get current date for use throughout seeding
    const today = new Date();

    // 0. CLEAR EXISTING DATA (using TRUNCATE to reset AUTO_INCREMENT)
    console.log('🗑️  Clearing existing data...');

    // Disable foreign key checks temporarily
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

    // Truncate all tables (clears data AND resets AUTO_INCREMENT)
    await db.execute(sql`TRUNCATE TABLE outages`);
    await db.execute(sql`TRUNCATE TABLE notifications`);
    await db.execute(sql`TRUNCATE TABLE bill_requests`);
    // Removed: connection_applications - redundant table
    await db.execute(sql`TRUNCATE TABLE work_orders`);
    await db.execute(sql`TRUNCATE TABLE complaints`);
    await db.execute(sql`TRUNCATE TABLE payments`);
    await db.execute(sql`TRUNCATE TABLE bills`);
    await db.execute(sql`TRUNCATE TABLE meter_readings`);
    await db.execute(sql`TRUNCATE TABLE tariff_slabs`);
    await db.execute(sql`TRUNCATE TABLE tariffs`);
    await db.execute(sql`TRUNCATE TABLE customers`);
    await db.execute(sql`TRUNCATE TABLE employees`);
    await db.execute(sql`TRUNCATE TABLE users`);

    // Re-enable foreign key checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    console.log('✅ Cleared all existing data\n');

    // 1. SEED USERS (1 Admin + 10 Employees + 50 Customers)
    console.log('👤 Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Admin user
    await db.insert(users).values({
      email: 'admin@electrolux.com',
      password: hashedPassword,
      userType: 'admin',
      name: 'Admin User',
      phone: '+1234567890',
      isActive: 1,
    });

    // Employee users
    const employeeUsers = [];
    for (let i = 1; i <= 10; i++) {
      employeeUsers.push({
        email: `employee${i}@electrolux.com`,
        password: hashedPassword,
        userType: 'employee' as const,
        name: faker.person.fullName(),
        phone: faker.string.numeric(10),
        isActive: 1,
      });
    }
    await db.insert(users).values(employeeUsers);

    // Customer users
    const customerUsers = [];
    for (let i = 1; i <= 50; i++) {
      customerUsers.push({
        email: `customer${i}@example.com`,
        password: hashedPassword,
        userType: 'customer' as const,
        name: faker.person.fullName(),
        phone: faker.string.numeric(10),
        isActive: 1,
      });
    }
    await db.insert(users).values(customerUsers);
    console.log('✅ Seeded 61 users (1 admin + 10 employees + 50 customers)\n');

    // 2. SEED EMPLOYEES
    console.log('👨‍💼 Seeding employees...');
    const designations = ['Meter Reader', 'Supervisor', 'Technician', 'Field Officer', 'Maintenance Staff'];
    const departments = ['Operations', 'Billing', 'Maintenance', 'Customer Service', 'Technical'];
    const zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];

    const employeeRecords = [];
    for (let i = 0; i < 10; i++) {
      employeeRecords.push({
        userId: i + 2, // Employee user IDs start from 2 (1 is admin)
        employeeNumber: `EMP-${String(i + 1).padStart(3, '0')}`, // EMP-001, EMP-002, etc.
        employeeName: employeeUsers[i].name,
        email: employeeUsers[i].email,
        phone: employeeUsers[i].phone,
        designation: designations[i % designations.length],
        department: departments[i % departments.length],
        assignedZone: zones[i % zones.length],
        status: 'active' as const,
        hireDate: format(faker.date.past({ years: 3 }), 'yyyy-MM-dd'),
      });
    }
    await db.insert(employees).values(employeeRecords as any);
    console.log('✅ Seeded 10 employees\n');

    // 3. SEED CUSTOMERS
    console.log('🏠 Seeding customers...');
    const connectionTypes = ['Residential', 'Commercial', 'Industrial', 'Agricultural'] as const;

    // Pakistani cities with realistic distribution
    const pakistaniCities = [
      { name: 'Karachi', code: 'KHI', state: 'Sindh', weight: 30 },      // 30% - Largest city
      { name: 'Lahore', code: 'LHE', state: 'Punjab', weight: 25 },      // 25% - 2nd largest
      { name: 'Islamabad', code: 'ISB', state: 'Islamabad Capital Territory', weight: 15 }, // 15%
      { name: 'Rawalpindi', code: 'RWP', state: 'Punjab', weight: 10 },  // 10%
      { name: 'Faisalabad', code: 'FSD', state: 'Punjab', weight: 10 },  // 10%
      { name: 'Multan', code: 'MUX', state: 'Punjab', weight: 5 },       // 5%
      { name: 'Peshawar', code: 'PEW', state: 'Khyber Pakhtunkhwa', weight: 3 }, // 3%
      { name: 'Quetta', code: 'UET', state: 'Balochistan', weight: 2 },  // 2%
    ];

    // Helper function to select city based on weighted distribution
    function selectCity() {
      const totalWeight = pakistaniCities.reduce((sum, city) => sum + city.weight, 0);
      let random = Math.random() * totalWeight;

      for (const city of pakistaniCities) {
        random -= city.weight;
        if (random <= 0) return city;
      }
      return pakistaniCities[0]; // Fallback to Karachi
    }

    const customerRecords = [];
    const cityCounters: { [key: string]: number } = {}; // Track meter numbers per city

    for (let i = 0; i < 50; i++) {
      const connectionType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
      const connectionDate = format(faker.date.past({ years: 2 }), 'yyyy-MM-dd');

      // Realistic distribution: 85% active, 10% suspended, 5% inactive
      const randomValue = Math.random();
      let customerStatus: 'active' | 'suspended' | 'inactive';
      if (randomValue < 0.85) {
        customerStatus = 'active';
      } else if (randomValue < 0.95) {
        customerStatus = 'suspended';
      } else {
        customerStatus = 'inactive';
      }

      // Select city based on distribution
      const selectedCity = selectCity();

      // Initialize or increment city counter
      if (!cityCounters[selectedCity.code]) {
        cityCounters[selectedCity.code] = 1;
      } else {
        cityCounters[selectedCity.code]++;
      }

      // Assign load shedding zone (distribute customers across 5 zones)
      const zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
      const assignedZone = zones[i % zones.length];

      customerRecords.push({
        userId: i + 12, // Customer user IDs start from 12 (1 admin + 10 employees + 1)
        accountNumber: generateAccountNumber(i + 1),
        meterNumber: generateMeterNumber(cityCounters[selectedCity.code], selectedCity.code),
        fullName: customerUsers[i].name,
        email: customerUsers[i].email,
        phone: customerUsers[i].phone,
        address: faker.location.streetAddress(),
        city: selectedCity.name,
        state: selectedCity.state,
        pincode: faker.location.zipCode(),
        zone: assignedZone,
        connectionType: connectionType,
        status: customerStatus,
        connectionDate: connectionDate,
        lastBillAmount: '0.00',
        lastPaymentDate: null,
        averageMonthlyUsage: '0.00',
        outstandingBalance: '0.00',
        paymentStatus: 'paid' as const,
      });
    }
    await db.insert(customers).values(customerRecords as any);
    console.log('✅ Seeded 50 customers\n');

    // Add EDGE CASE customers for testing bulk bill generation
    console.log('🆕 Adding edge case customers for bulk generation testing...');

    const currentMonth = format(today, 'yyyy-MM-01');
    const lastMonth = format(subMonths(today, 1), 'yyyy-MM-01');
    const twoMonthsAgo = format(subMonths(today, 2), 'yyyy-MM-01');

    const edgeCaseCustomers = [
      // EDGE CASE 1: Brand new customer - connected THIS month, zero history
      {
        userId: 62, // Customer 51
        accountNumber: generateAccountNumber(51),
        meterNumber: generateMeterNumber(51, 'KHI'),
        fullName: faker.person.fullName(),
        email: `customer51@gmail.com`,
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: 'Karachi',
        state: 'Sindh',
        pincode: '75000',
        zone: 'Zone A',
        connectionType: 'Residential',
        status: 'active',
        connectionDate: currentMonth, // ⭐ Connected THIS month
        outstandingBalance: '0.00',
        lastBillAmount: '0.00',
        paymentStatus: 'paid',
      },
      // EDGE CASE 2: New customer - connected LAST month, has 1 month history
      {
        userId: 63, // Customer 52
        accountNumber: generateAccountNumber(52),
        meterNumber: generateMeterNumber(52, 'LHE'),
        fullName: faker.person.fullName(),
        email: `customer52@gmail.com`,
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: 'Lahore',
        state: 'Punjab',
        pincode: '54000',
        zone: 'Zone B',
        connectionType: 'Commercial',
        status: 'active',
        connectionDate: lastMonth, // ⭐ Connected last month
        outstandingBalance: '0.00',
        lastBillAmount: '0.00',
        paymentStatus: 'paid',
      },
      // EDGE CASE 3: New customer - connected 2 months ago, has some history
      {
        userId: 64, // Customer 53
        accountNumber: generateAccountNumber(53),
        meterNumber: generateMeterNumber(53, 'ISB'),
        fullName: faker.person.fullName(),
        email: `customer53@gmail.com`,
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: 'Islamabad',
        state: 'Islamabad Capital Territory',
        pincode: '44000',
        zone: 'Zone C',
        connectionType: 'Agricultural',
        status: 'active',
        connectionDate: twoMonthsAgo, // ⭐ Connected 2 months ago
        outstandingBalance: '0.00',
        lastBillAmount: '0.00',
        paymentStatus: 'paid',
      },
    ];

    // Add edge case users first
    const edgeCaseUsers = edgeCaseCustomers.map((c, i) => ({
      id: c.userId,
      email: c.email,
      password: hashedPassword,
      userType: 'customer' as const,
      name: c.fullName,
      phone: c.phone,
      isActive: 1,
    }));

    await db.insert(users).values(edgeCaseUsers as any);
    await db.insert(customers).values(edgeCaseCustomers as any);

    console.log('✅ Added 3 edge case customers:');
    console.log('   - Customer 51: Brand new (connected THIS month, no history)');
    console.log('   - Customer 52: Recent (connected LAST month, 1 month history)');
    console.log('   - Customer 53: New (connected 2 months ago, partial history)\n');

    // 4. SEED TARIFFS (4 categories) - normalized with tariff_slabs
    console.log('💰 Seeding tariffs...');
    const tariffSeed = [
      {
        category: 'Residential' as const,
        fixedCharge: '50.00',
        slabs: [
          { order: 1, start: 0, end: 100, rate: '4.50' },
          { order: 2, start: 101, end: 200, rate: '6.00' },
          { order: 3, start: 201, end: 300, rate: '7.50' },
          { order: 4, start: 301, end: 500, rate: '9.00' },
          { order: 5, start: 501, end: null, rate: '10.50' },
        ],
        timeOfUsePeakRate: '12.00',
        timeOfUseNormalRate: '7.50',
        timeOfUseOffpeakRate: '5.00',
        electricityDutyPercent: '6.00',
        gstPercent: '18.00',
        effectiveDate: '2024-01-01',
        validUntil: null,
      },
      {
        category: 'Commercial' as const,
        fixedCharge: '150.00',
        slabs: [
          { order: 1, start: 0, end: 200, rate: '7.00' },
          { order: 2, start: 201, end: 500, rate: '8.50' },
          { order: 3, start: 501, end: 1000, rate: '10.00' },
          { order: 4, start: 1001, end: 2000, rate: '11.50' },
          { order: 5, start: 2001, end: null, rate: '13.00' },
        ],
        timeOfUsePeakRate: '15.00',
        timeOfUseNormalRate: '10.00',
        timeOfUseOffpeakRate: '7.00',
        electricityDutyPercent: '8.00',
        gstPercent: '18.00',
        effectiveDate: '2024-01-01',
        validUntil: null,
      },
      {
        category: 'Industrial' as const,
        fixedCharge: '500.00',
        slabs: [
          { order: 1, start: 0, end: 1000, rate: '6.50' },
          { order: 2, start: 1001, end: 5000, rate: '7.50' },
          { order: 3, start: 5001, end: 10000, rate: '8.50' },
          { order: 4, start: 10001, end: 20000, rate: '9.50' },
          { order: 5, start: 20001, end: null, rate: '10.50' },
        ],
        timeOfUsePeakRate: '13.00',
        timeOfUseNormalRate: '8.50',
        timeOfUseOffpeakRate: '6.00',
        electricityDutyPercent: '10.00',
        gstPercent: '18.00',
        effectiveDate: '2024-01-01',
        validUntil: null,
      },
      {
        category: 'Agricultural' as const,
        fixedCharge: '30.00',
        slabs: [
          { order: 1, start: 0, end: 200, rate: '3.00' },
          { order: 2, start: 201, end: 500, rate: '4.00' },
          { order: 3, start: 501, end: 1000, rate: '5.00' },
          { order: 4, start: 1001, end: 2000, rate: '6.00' },
          { order: 5, start: 2001, end: null, rate: '7.00' },
        ],
        timeOfUsePeakRate: '8.00',
        timeOfUseNormalRate: '5.00',
        timeOfUseOffpeakRate: '3.50',
        electricityDutyPercent: '4.00',
        gstPercent: '18.00',
        effectiveDate: '2024-01-01',
        validUntil: null,
      },
    ];

    for (const t of tariffSeed) {
      const [insertedTariff] = await db.insert(tariffs).values({
        category: t.category,
        fixedCharge: t.fixedCharge,
        timeOfUsePeakRate: t.timeOfUsePeakRate,
        timeOfUseNormalRate: t.timeOfUseNormalRate,
        timeOfUseOffpeakRate: t.timeOfUseOffpeakRate,
        electricityDutyPercent: t.electricityDutyPercent,
        gstPercent: t.gstPercent,
        effectiveDate: t.effectiveDate,
        validUntil: t.validUntil,
      } as any);

      const tariffId = (insertedTariff as any).insertId;
      const slabRows = t.slabs.map(s => ({
        tariffId,
        slabOrder: s.order,
        startUnits: s.start,
        endUnits: s.end,
        ratePerUnit: s.rate,
      }));
      await db.insert(tariffSlabs).values(slabRows as any);
    }
    console.log('✅ Seeded 4 tariff categories with normalized slabs\n');

    // 5. SEED METER READINGS & BILLS (6 months for 50 customers = 300 records each)
    console.log('📊 Seeding meter readings and bills (previous 5 months only)...');
    console.log('⚠️  IMPORTANT: Current month has NO readings and NO bills - ready for bulk generation demo!');

    // today is already declared at the top of the seed function
    let billCounter = 1;
    let paymentCounter = 1;

    // Process all customers including edge cases (50 regular + 3 edge case = 53 total)
    for (let customerId = 1; customerId <= 53; customerId++) {
      let previousReading = faker.number.int({ min: 1000, max: 5000 });

      // Get customer details (handle edge case customers separately)
      const customer = customerId <= 50 ? customerRecords[customerId - 1] : edgeCaseCustomers[customerId - 51];
      const tariffCategory = customer.connectionType;

      // Get tariff for this customer
      const tariff = tariffSeed.find((t: any) => t.category === tariffCategory)!;

      // EDGE CASE HANDLING: Skip historical data for edge case customers based on their connection date
      let maxHistoryMonths = 5;
      if (customerId === 51) {
        // Customer 51: Connected THIS month - NO history at all
        maxHistoryMonths = 0;
        console.log(`⭐ Skipping historical data for Customer ${customerId} (brand new - connected this month)`);
        previousReading = 0; // Will be used in next iteration if needed
        continue; // Skip to next customer
      } else if (customerId === 52) {
        // Customer 52: Connected LAST month - Only 1 month of history
        maxHistoryMonths = 1;
      } else if (customerId === 53) {
        // Customer 53: Connected 2 months ago - Only 2 months of history
        maxHistoryMonths = 2;
      }

      // Only generate for previous months (based on customer history)
      // Current month (monthOffset 0) is left EMPTY for bulk bill generation demo
      for (let monthOffset = maxHistoryMonths; monthOffset >= 1; monthOffset--) {
        const readingDate = subMonths(today, monthOffset);
        const billingMonth = format(readingDate, 'yyyy-MM-01');
        const issueDate = format(addDays(readingDate, 2), 'yyyy-MM-dd');
        const dueDate = format(addDays(readingDate, 17), 'yyyy-MM-dd');

        // Generate consumption based on connection type
        let monthlyConsumption: number;
        switch (tariffCategory) {
          case 'Residential':
            monthlyConsumption = faker.number.int({ min: 80, max: 400 });
            break;
          case 'Commercial':
            monthlyConsumption = faker.number.int({ min: 500, max: 2000 });
            break;
          case 'Industrial':
            monthlyConsumption = faker.number.int({ min: 5000, max: 15000 });
            break;
          case 'Agricultural':
            monthlyConsumption = faker.number.int({ min: 300, max: 1500 });
            break;
          default:
            monthlyConsumption = faker.number.int({ min: 80, max: 400 }); // Default to residential
            break;
        }

        const currentReading = previousReading + monthlyConsumption;

        // Insert meter reading and capture its ID
        const meterReadingInsert = await db.insert(meterReadings).values({
          customerId: customerId,
          meterNumber: customer.meterNumber,
          currentReading: currentReading.toString(),
          previousReading: previousReading.toString(),
          unitsConsumed: monthlyConsumption.toString(),
          readingDate: format(readingDate, 'yyyy-MM-dd'),
          readingTime: readingDate,
          meterCondition: 'good',
          accessibility: 'accessible',
          employeeId: faker.number.int({ min: 1, max: 10 }), // Random employee
          photoPath: null,
          notes: null,
        } as any);

        // Get the inserted meter reading ID
        const meterReadingId = (meterReadingInsert as any).insertId;

        // Calculate bill amount using tariff slabs
        let baseAmount = 0;
        let remainingUnits = monthlyConsumption;

        // Apply slab rates from normalized tariff_slabs
        const slabs = (
          tariff.slabs as Array<{ start: number | null; end: number | null; rate: string }>
        ).map((s) => ({ start: s.start ?? 0, end: s.end ?? 999999, rate: parseFloat(s.rate) }));

        for (const slab of slabs) {
          if (remainingUnits <= 0) break;

          const slabUnits = Math.min(remainingUnits, slab.end - slab.start + 1);
          baseAmount += slabUnits * slab.rate;
          remainingUnits -= slabUnits;
        }

        // Round baseAmount to whole number (no decimal paisa) - matches API logic
        baseAmount = Math.round(baseAmount);

        // Calculate all charges with whole-number rounding at each step
        const fixedCharges = Math.round(parseFloat(tariff.fixedCharge));

        // Apply electricity duty on baseAmount only (NOT on fixed charges)
        const electricityDuty = Math.round(baseAmount * (parseFloat(tariff.electricityDutyPercent) / 100));

        // Apply GST on (baseAmount + fixedCharges + electricityDuty)
        const gstAmount = Math.round((baseAmount + fixedCharges + electricityDuty) * (parseFloat(tariff.gstPercent) / 100));

        // Calculate total with whole-number rounding
        const totalAmount = Math.round(baseAmount + fixedCharges + electricityDuty + gstAmount);

        // Always create bills for all months we have readings
        // (We only create readings for 5 previous months, so all will get bills)
        // Realistic payment behavior: 95% of old bills get paid, 5% remain unpaid
        const willPayBill = Math.random() > 0.05;
        const billStatus = willPayBill ? 'paid' : 'issued';

        await db.insert(bills).values({
          customerId: customerId,
          billNumber: generateBillNumber(6 - monthOffset, customerId),
          billingMonth: billingMonth,
          issueDate: issueDate,
          dueDate: dueDate,
          unitsConsumed: monthlyConsumption.toString(),
          meterReadingId: meterReadingId,
          baseAmount: baseAmount.toFixed(2),
          fixedCharges: fixedCharges.toFixed(2),
          electricityDuty: electricityDuty.toFixed(2),
          gstAmount: gstAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          status: billStatus,
          paymentDate: willPayBill ? format(addDays(readingDate, faker.number.int({ min: 5, max: 15 })), 'yyyy-MM-dd') : null,
        } as any);

        // Insert payment only if bill was paid
        if (willPayBill) {
          const paymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'upi', 'wallet'] as const;
          await db.insert(payments).values({
            customerId: customerId,
            billId: billCounter,
            paymentAmount: totalAmount.toFixed(2),
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            paymentDate: format(addDays(readingDate, faker.number.int({ min: 5, max: 15 })), 'yyyy-MM-dd'),
            transactionId: generateTransactionId(),
            receiptNumber: generateReceiptNumber(paymentCounter),
            status: 'completed',
            notes: null,
          } as any);
          paymentCounter++;
        }

        billCounter++;
        previousReading = currentReading;
      }
    }
    console.log('✅ Seeded 250 meter readings (5 previous months only)\n');
    console.log('✅ Seeded 250 bills (5 previous months only)\n');
    console.log(`✅ Seeded ~${paymentCounter - 1} payments\n`);

    // UPDATE CUSTOMER BALANCES AND PAYMENT STATUSES
    console.log('💰 Updating customer balances and payment statuses...');
    // Process all customers including edge cases (50 regular + 3 edge case = 53 total)
    for (let customerId = 1; customerId <= 53; customerId++) {
      try {
        // Get all bills for this customer
        const customerBills = await db
          .select()
          .from(bills)
          .where(eq(bills.customerId, customerId));

        if (!customerBills || customerBills.length === 0) {
          console.warn(`⚠️ No bills found for customer ${customerId}`);
          continue;
        }

        // Get all payments for this customer
        const customerPayments = await db
          .select()
          .from(payments)
          .where(eq(payments.customerId, customerId));

        // Calculate outstanding balance (unpaid bills)
        const unpaidBills = customerBills.filter(b => b.status === 'issued' || b.status === 'generated');
        const outstandingBalance = unpaidBills.reduce((sum, bill) => {
          return sum + parseFloat(bill.totalAmount || '0');
        }, 0);

        // Get last bill
        const lastBill = customerBills.reduce((latest, current) => {
          return new Date(current.issueDate) > new Date(latest.issueDate) ? current : latest;
        }, customerBills[0]);

        const lastBillAmount = lastBill ? parseFloat(lastBill.totalAmount || '0') : 0;

        // Get last payment date
        let lastPaymentDate = null;
        if (customerPayments && customerPayments.length > 0) {
          const lastPayment = customerPayments.reduce((latest, current) => {
            return new Date(current.paymentDate) > new Date(latest.paymentDate) ? current : latest;
          }, customerPayments[0]);
          lastPaymentDate = lastPayment?.paymentDate || null;
        }

        // Calculate average monthly usage
        const totalUnitsConsumed = customerBills.reduce((sum, bill) => {
          return sum + parseFloat(bill.unitsConsumed || '0');
        }, 0);
        const averageMonthlyUsage = customerBills.length > 0
          ? (totalUnitsConsumed / customerBills.length)
          : 0;

        // Determine payment status
        let paymentStatus: 'paid' | 'pending' | 'overdue' = 'paid';
        if (outstandingBalance > 0) {
          // Check if any unpaid bill is overdue
          const today = new Date();
          const hasOverdueBill = unpaidBills.some(bill => {
            return new Date(bill.dueDate) < today;
          });
          paymentStatus = hasOverdueBill ? 'overdue' : 'pending';
        }

        // Update customer record
        await db
          .update(customers)
          .set({
            outstandingBalance: outstandingBalance.toFixed(2),
            lastBillAmount: lastBillAmount.toFixed(2),
            lastPaymentDate: lastPaymentDate,
            averageMonthlyUsage: averageMonthlyUsage.toFixed(2),
            paymentStatus: paymentStatus,
          })
          .where(eq(customers.id, customerId));

      } catch (error) {
        console.error(`❌ Error updating customer ${customerId}:`, error);
        // Continue with next customer instead of failing entire seed
      }
    }
    console.log('✅ Updated customer balances and payment statuses\n');

    // 6. SEED BILL REQUESTS (Pending requests for customers with meter readings but no bills)
    console.log('📝 Seeding bill requests for CURRENT MONTH...');
    console.log('💡 These simulate customers requesting meter reading + bill for current billing period');

    // Strategy: Create bill requests for current month ONLY
    // This demonstrates the flow: Customer requests → Employee takes reading → Admin generates bill
    // (currentMonth already declared above in edge case customers section)
    const billRequestRecords: any[] = [];

    // Create bill requests for ~15 customers (30% of 50)
    const customersWithRequests = Array.from({ length: 50 }, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, 15); // Take first 15

    for (let i = 0; i < customersWithRequests.length; i++) {
      const customerId = customersWithRequests[i];
      const requestId = `BREQ-2024-${String(i + 1).padStart(6, '0')}`;
      const priorities = ['low', 'medium', 'high'] as const;
      const randomPriority = priorities[i % 3]; // Distribute evenly

      // Request date is somewhere in the last 5 days of previous month or first 3 days of current month
      const requestDate = subDays(today, faker.number.int({ min: 0, max: 8 }));

      billRequestRecords.push({
        requestId: requestId,
        customerId: customerId,
        billingMonth: currentMonth,
        priority: randomPriority,
        notes: `Customer requesting meter reading and bill generation for ${format(today, 'MMMM yyyy')} billing period. No reading taken yet for this month.`,
        status: 'pending' as const,
        requestDate: format(requestDate, 'yyyy-MM-dd'),
        createdBy: null, // Customer-initiated via portal
      });
    }

    if (billRequestRecords.length > 0) {
      await db.insert(billRequests).values(billRequestRecords as any);
      console.log(`✅ Seeded ${billRequestRecords.length} bill requests for current month (all pending)`);
      console.log(`📌 Demo flow: Customers requested → Employees take readings → Admin generates bulk bills\n`);
    }

    // 7. SEED WORK ORDERS (20 recent work orders)
    console.log('📋 Seeding work orders...');
    const workOrderTypes = ['meter_reading', 'maintenance', 'complaint_resolution', 'new_connection', 'reconnection'] as const;
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;
    const statuses = ['assigned', 'in_progress', 'completed'] as const;

    const workOrderRecords = [];
    for (let i = 0; i < 20; i++) {
      const assignedDate = format(faker.date.recent({ days: 30 }), 'yyyy-MM-dd');
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      workOrderRecords.push({
        employeeId: faker.number.int({ min: 1, max: 10 }),
        customerId: faker.number.int({ min: 1, max: 50 }),
        workType: workOrderTypes[Math.floor(Math.random() * workOrderTypes.length)],
        title: faker.company.catchPhrase(),
        description: faker.lorem.sentence(),
        status: status,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assignedDate: assignedDate,
        dueDate: format(addDays(new Date(assignedDate), faker.number.int({ min: 1, max: 7 })), 'yyyy-MM-dd'),
        completionDate: status === 'completed' ? format(addDays(new Date(assignedDate), faker.number.int({ min: 1, max: 5 })), 'yyyy-MM-dd') : null,
        completionNotes: status === 'completed' ? faker.lorem.sentence() : null,
      });
    }
    await db.insert(workOrders).values(workOrderRecords as any);
    console.log('✅ Seeded 20 work orders\n');

    // 8. CONNECTION APPLICATIONS - REMOVED (redundant with connectionRequests table)
    console.log('🔌 Skipping connection applications...\n');

    // 9. SEED NOTIFICATIONS (50 recent notifications) - SKIPPED
    console.log('🔔 Skipping notifications...\n');

    // 9. SEED OUTAGES (Power Outage Management)
    console.log('⚡ Seeding outages...');

    const outageZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
    const outageAreas = [
      'North District', 'South District', 'East District', 'West District', 'Central District',
      'Industrial Area', 'Residential Complex A', 'Residential Complex B', 'Business Park', 'Downtown'
    ];

    // Calculate actual customer counts per zone (FIX FOR ACCURACY)
    const zoneCounts: { [key: string]: number } = {};
    for (const zone of outageZones) {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(customers)
        .where(eq(customers.zone, zone));
      zoneCounts[zone] = countResult.count;
    }
    console.log('📊 Customer counts per zone:', zoneCounts);

    const outageData = [];
    const now = new Date();

    // Past completed outages (10)
    for (let i = 0; i < 10; i++) {
      const zone = outageZones[i % outageZones.length];
      const area = outageAreas[i % outageAreas.length];
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() - daysAgo);
      startTime.setHours(Math.floor(Math.random() * 24), 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(Math.random() * 4) + 1);

      outageData.push({
        areaName: `${zone} - ${area}`,
        zone: zone,
        outageType: i % 3 === 0 ? 'unplanned' : 'planned',
        reason: i % 3 === 0
          ? 'Equipment failure - transformer malfunction'
          : i % 2 === 0
          ? 'Scheduled maintenance - power line upgrade'
          : 'Infrastructure improvement - substation work',
        severity: i % 5 === 0 ? 'critical' : i % 3 === 0 ? 'high' : 'medium',
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        actualStartTime: startTime,
        actualEndTime: endTime,
        affectedCustomerCount: zoneCounts[zone] || 0, // FIX: Use actual customer count
        status: 'restored',
        restorationNotes: 'Power successfully restored. All systems functioning normally.',
        createdBy: 1 // Admin user
      });
    }

    // Ongoing outages (2)
    for (let i = 0; i < 2; i++) {
      const zone = outageZones[(i + 2) % outageZones.length];
      const area = outageAreas[(i + 3) % outageAreas.length];
      const startTime = new Date(now);
      startTime.setHours(startTime.getHours() - Math.floor(Math.random() * 3) - 1);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 2 + i);

      outageData.push({
        areaName: `${zone} - ${area}`,
        zone: zone,
        outageType: 'unplanned',
        reason: i === 0 ? 'Emergency repair - cable fault' : 'Weather damage - storm impact',
        severity: 'high',
        scheduledStartTime: null,
        scheduledEndTime: endTime,
        actualStartTime: startTime,
        actualEndTime: null,
        affectedCustomerCount: zoneCounts[zone] || 0, // FIX: Use actual customer count
        status: 'ongoing',
        restorationNotes: 'Repair crew on site. Estimated completion time provided.',
        createdBy: 1
      });
    }

    // Scheduled future outages (8)
    for (let i = 0; i < 8; i++) {
      const zone = outageZones[i % outageZones.length];
      const area = outageAreas[(i + 5) % outageAreas.length];
      const daysAhead = Math.floor(Math.random() * 14) + 1;
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() + daysAhead);
      startTime.setHours(i % 2 === 0 ? 6 : 14, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + (i % 2 === 0 ? 2 : 3));

      outageData.push({
        areaName: `${zone} - ${area}`,
        zone: zone,
        outageType: 'planned',
        reason: i % 2 === 0
          ? 'Scheduled maintenance - grid modernization'
          : 'Infrastructure upgrade - smart meter installation',
        severity: i % 3 === 0 ? 'medium' : 'low',
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        actualStartTime: null,
        actualEndTime: null,
        affectedCustomerCount: zoneCounts[zone] || 0, // FIX: Use actual customer count
        status: 'scheduled',
        restorationNotes: null,
        createdBy: 1
      });
    }

    await db.insert(outages).values(outageData as any);
    console.log(`✅ Seeded ${outageData.length} outages (10 completed + 2 ongoing + 8 scheduled)\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  - 64 users (1 admin + 10 employees + 53 customers)');
    console.log('  - 10 employees');
    console.log('  - 53 customers (50 regular + 3 edge cases)');
    console.log('  - 4 tariff categories with normalized slabs');
    console.log('  - ~253 meter readings (5 months for regular, partial for edge cases)');
    console.log('  - ~253 bills (historical data only)');
    console.log('  - ~240 payments');
    console.log('  - ~15 bill requests for CURRENT month (pending)');
    console.log('  - 20 work orders');
    console.log('  - 10 connection applications');
    console.log('  - 50 notifications');
    console.log('  - 20 outages (10 completed + 2 ongoing + 8 scheduled)');
    console.log('\n⚠️  IMPORTANT: Current month has NO readings/bills - ready for bulk generation demo!');
    console.log('🆕 Edge Case Customers Added:');
    console.log('   - Customer 51 (ELX-2024-000051): Brand new, connected THIS month, ZERO history');
    console.log('   - Customer 52 (ELX-2024-000052): Connected LAST month, has 1 month history');
    console.log('   - Customer 53 (ELX-2024-000053): Connected 2 months ago, has 2 months history');
    console.log('\n📌 Viva Demo Flow:');
    console.log('   1. Show pending bill requests from customers');
    console.log('   2. Admin clicks "Generate Bulk Bills" → Load previews');
    console.log('   3. System auto-generates readings for customers without history (edge cases!)');
    console.log('   4. Admin confirms → Bills generated for ALL 53 customers!');
    console.log('   5. Explain to professor how system handles brand new customers\n');
    console.log('✨ Total: ~880+ records created!\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log('✅ Seeding script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });

