import { db } from './db';
import { users, customers, bills, payments, employees, meterReadings, tariffs } from './schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function testQueries() {
  console.log(`${colors.cyan}🧪 Running Database Test Queries...${colors.reset}\n`);

  try {
    // Test 1: Get all users by type
    console.log(`${colors.blue}Test 1: User Count by Type${colors.reset}`);
    const userCounts = await db
      .select({
        userType: users.userType,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.userType);
    console.table(userCounts);

    // Test 2: Top 5 customers by outstanding balance
    console.log(`\n${colors.blue}Test 2: Top 5 Customers by Outstanding Balance${colors.reset}`);
    const topCustomers = await db
      .select({
        accountNumber: customers.accountNumber,
        fullName: customers.fullName,
        connectionType: customers.connectionType,
        outstandingBalance: customers.outstandingBalance,
      })
      .from(customers)
      .orderBy(desc(customers.outstandingBalance))
      .limit(5);
    console.table(topCustomers);

    // Test 3: Recent bills with customer info (JOIN)
    console.log(`\n${colors.blue}Test 3: Recent Bills with Customer Info (JOIN)${colors.reset}`);
    const recentBills = await db
      .select({
        billNumber: bills.billNumber,
        customerName: customers.fullName,
        accountNumber: customers.accountNumber,
        totalAmount: bills.totalAmount,
        status: bills.status,
        dueDate: bills.dueDate,
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .orderBy(desc(bills.issueDate))
      .limit(5);
    console.table(recentBills);

    // Test 4: Employee workload
    console.log(`\n${colors.blue}Test 4: Employee Workload (Meter Readings Count)${colors.reset}`);
    const employeeWorkload = await db
      .select({
        employeeName: employees.employeeName,
        designation: employees.designation,
        readingsCount: sql<number>`count(${meterReadings.id})`,
      })
      .from(employees)
      .leftJoin(meterReadings, eq(employees.id, meterReadings.employeeId))
      .groupBy(employees.id);
    console.table(employeeWorkload);

    // Test 5: Revenue summary by connection type
    console.log(`\n${colors.blue}Test 5: Revenue Summary by Connection Type${colors.reset}`);
    const revenueSummary = await db
      .select({
        connectionType: customers.connectionType,
        totalBills: sql<number>`count(${bills.id})`,
        totalRevenue: sql<number>`sum(${bills.totalAmount})`,
        avgBillAmount: sql<number>`avg(${bills.totalAmount})`,
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .where(eq(bills.status, 'paid'))
      .groupBy(customers.connectionType);
    console.table(revenueSummary);

    // Test 6: Payment methods distribution
    console.log(`\n${colors.blue}Test 6: Payment Methods Distribution${colors.reset}`);
    const paymentMethods = await db
      .select({
        method: payments.paymentMethod,
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${payments.paymentAmount})`,
      })
      .from(payments)
      .groupBy(payments.paymentMethod);
    console.table(paymentMethods);

    // Test 7: Current month unpaid bills
    console.log(`\n${colors.blue}Test 7: Current Month Unpaid Bills${colors.reset}`);
    const unpaidBills = await db
      .select({
        billNumber: bills.billNumber,
        customerName: customers.fullName,
        totalAmount: bills.totalAmount,
        dueDate: bills.dueDate,
        daysOverdue: sql<number>`DATEDIFF(CURDATE(), ${bills.dueDate})`,
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .where(and(
        eq(bills.status, 'issued'),
        lte(bills.dueDate, sql`CURDATE()`)
      ))
      .limit(10);
    console.table(unpaidBills);

    // Test 8: Tariff information
    console.log(`\n${colors.blue}Test 8: Tariff Categories${colors.reset}`);
    const tariffInfo = await db
      .select({
        category: tariffs.category,
        fixedCharge: tariffs.fixedCharge,
        electricityDutyPercent: tariffs.electricityDutyPercent,
        gstPercent: tariffs.gstPercent,
        effectiveDate: tariffs.effectiveDate,
        validUntil: tariffs.validUntil,
      })
      .from(tariffs);
    console.table(tariffInfo);

    // Test 9: Average consumption by connection type
    console.log(`\n${colors.blue}Test 9: Average Monthly Consumption by Connection Type${colors.reset}`);
    const avgConsumption = await db
      .select({
        connectionType: customers.connectionType,
        avgUsage: sql<number>`avg(${meterReadings.unitsConsumed})`,
        minUsage: sql<number>`min(${meterReadings.unitsConsumed})`,
        maxUsage: sql<number>`max(${meterReadings.unitsConsumed})`,
      })
      .from(meterReadings)
      .leftJoin(customers, eq(meterReadings.customerId, customers.id))
      .groupBy(customers.connectionType);
    console.table(avgConsumption);

    // Test 10: Customer with complete details
    console.log(`\n${colors.blue}Test 10: Sample Customer Complete Details${colors.reset}`);
    const customerDetails = await db
      .select({
        // Customer info
        accountNumber: customers.accountNumber,
        fullName: customers.fullName,
        email: customers.email,
        phone: customers.phone,
        connectionType: customers.connectionType,
        // User info
        userEmail: users.email,
        // Latest bill
        latestBillNumber: sql<string>`(SELECT bill_number FROM bills WHERE customer_id = ${customers.id} ORDER BY issue_date DESC LIMIT 1)`,
        latestBillAmount: sql<number>`(SELECT total_amount FROM bills WHERE customer_id = ${customers.id} ORDER BY issue_date DESC LIMIT 1)`,
        // Payment status
        totalOutstanding: sql<number>`(SELECT SUM(total_amount) FROM bills WHERE customer_id = ${customers.id} AND status != 'paid')`,
      })
      .from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .limit(1);
    console.log('\n', customerDetails[0]);

    console.log(`\n${colors.green}✅ All test queries executed successfully!${colors.reset}`);
    console.log(`${colors.yellow}\n💡 Tip: Run 'npm run db:studio' to explore data visually${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.magenta}❌ Error:${colors.reset}`, error);
  }

  process.exit(0);
}

// Run tests
testQueries();

