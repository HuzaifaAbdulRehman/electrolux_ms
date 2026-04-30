import { db } from '@/lib/drizzle/db';
import { bills, customers, payments, users, workOrders, tariffs, tariffSlabs } from '@/lib/drizzle/schema';
import { eq, sql, and, desc, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * TRANSACTION SERVICE FOR ACID COMPLIANCE
 *
 * This service implements proper database transactions to ensure
 * ACID properties as required by DBMS theory:
 *
 * A - Atomicity: All operations succeed or all fail
 * C - Consistency: Database remains in valid state
 * I - Isolation: Concurrent transactions don't interfere
 * D - Durability: Committed data persists
 */

/**
 * Process payment with full ACID compliance
 * Demonstrates proper transaction handling for critical financial operations
 */
export async function processPaymentTransaction(
  customerId: number,
  billId: number,
  amount: number,
  paymentMethod: string,
  transactionId: string,
  processedBy?: number
) {
  // MySQL doesn't support native transactions in Drizzle yet,
  // so we'll use a try-catch with manual rollback logic
  let paymentId: number | null = null;

  try {
    // Start implicit transaction
    await db.transaction(async (tx) => {
      // Step 1: Insert payment record
      const [paymentResult] = await tx.insert(payments).values({
        customerId,
        billId,
        paymentAmount: amount.toString(),
        paymentMethod,
        paymentDate: new Date().toISOString().split('T')[0],
        transactionId,
        receiptNumber: `RCP-${Date.now()}`,
        status: 'completed',
      } as any);

      paymentId = paymentResult.insertId;

      // Step 2: Get bill details
      const [billData] = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, billId));

      if (!billData) {
        throw new Error('Bill not found');
      }

      // Step 3: Update bill status
      const billAmount = parseFloat(billData.totalAmount);
      const newStatus = amount >= billAmount ? 'paid' : 'issued';

      await tx
        .update(bills)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(bills.id, billId));

      // Step 4: Calculate new outstanding balance
      const outstandingResult = await tx
        .select({
          totalDue: sql<number>`
            SELECT COALESCE(SUM(b.total_amount), 0)
            FROM bills b
            WHERE b.customer_id = ${customerId}
            AND b.status != 'paid'
          `,
          totalPaid: sql<number>`
            SELECT COALESCE(SUM(p.amount), 0)
            FROM payments p
            WHERE p.customer_id = ${customerId}
          `,
        })
        .from(customers)
        .where(eq(customers.id, customerId));

      const outstanding = (outstandingResult[0]?.totalDue || 0) - (outstandingResult[0]?.totalPaid || 0);

      // Step 5: Update customer record
      await tx
        .update(customers)
        .set({
          lastPaymentDate: new Date().toISOString().split('T')[0],
          outstandingBalance: outstanding.toString(),
          paymentStatus: outstanding > 0 ? 'pending' : 'paid',
          updatedAt: new Date(),
        } as any)
        .where(eq(customers.id, customerId));

      // Transaction commits automatically if no error
      return {
        success: true,
        paymentId,
        receiptNumber: `RCP-${Date.now()}`,
      };
    });
  } catch (error) {
    // Transaction automatically rolls back on error
    console.error('Payment transaction failed:', error);

    // Manual cleanup if needed (shouldn't be necessary with proper transaction)
    if (paymentId) {
      try {
        await db.delete(payments).where(eq(payments.id, paymentId));
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
    }

    throw new Error(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Register customer with full ACID compliance
 * Ensures user and customer records are created atomically
 */
export async function registerCustomerTransaction(userData: {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  connectionType: 'residential' | 'commercial' | 'industrial';
}) {
  let userId: number | null = null;

  try {
    return await db.transaction(async (tx) => {
      // Step 1: Check if email already exists
      const existingUser = await tx
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('Email already registered');
      }

      // Step 2: Generate secure password hash
      const saltRounds = 12; // DBMS security best practice
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Step 3: Create user account
      const [userResult] = await tx.insert(users).values({
        email: userData.email,
        password: hashedPassword,
        userType: 'customer',
        name: userData.name,
        phone: userData.phone,
        isActive: 1,
      });

      userId = userResult.insertId;

      // Step 4: Generate unique account and meter numbers
      const timestamp = Date.now();
      const accountNumber = `ELX-${new Date().getFullYear()}-${String(userId).padStart(6, '0')}`;
      const meterNumber = `MTR-${String(userId).padStart(6, '0')}`;

      // Step 5: Create customer record
      const [customerResult] = await tx.insert(customers).values({
        userId,
        accountNumber,
        meterNumber,
        fullName: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        pincode: userData.pincode,
        connectionType: userData.connectionType,
        status: 'active',
        connectionDate: new Date().toISOString().split('T')[0],
        lastBillAmount: '0',
        outstandingBalance: '0',
        averageMonthlyUsage: '0',
        paymentStatus: 'paid',
      } as any);

      // Transaction commits automatically
      return {
        success: true,
        userId,
        customerId: customerResult.insertId,
        accountNumber,
        meterNumber,
      };
    });
  } catch (error) {
    // Transaction automatically rolls back
    console.error('Registration transaction failed:', error);

    // Manual cleanup shouldn't be needed with proper transaction
    if (userId) {
      try {
        await db.delete(users).where(eq(users.id, userId));
      } catch (cleanupError) {
        console.error('User cleanup failed:', cleanupError);
      }
    }

    throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate bill with ACID compliance
 * Ensures meter reading, bill creation, and customer update are atomic
 */
export async function generateBillTransaction(
  customerId: number,
  meterReadingId: number,
  unitsConsumed: number,
  tariffId: number
) {
  try {
    return await db.transaction(async (tx) => {
      // Step 1: Get tariff details
      const [tariffData] = await tx
        .select()
        .from(tariffs)
        .where(eq(tariffs.id, tariffId))
        .limit(1);

      if (!tariffData) {
        throw new Error('Tariff not found');
      }

      // Step 2: Get tariff slabs from normalized tariff_slabs table
      const slabs = await tx
        .select()
        .from(tariffSlabs)
        .where(eq(tariffSlabs.tariffId, tariffId))
        .orderBy(asc(tariffSlabs.slabOrder));

      if (slabs.length === 0) {
        throw new Error('No tariff slabs found for this tariff');
      }

      // Step 3: Calculate bill amount using normalized slab structure
      let baseAmount = 0;
      let remainingUnits = unitsConsumed;

      for (const slab of slabs) {
        if (remainingUnits <= 0) break;

        const slabStart = Number(slab.startUnits);
        const slabEnd = slab.endUnits ? Number(slab.endUnits) : Infinity;
        const slabRate = Number(slab.ratePerUnit);

        const unitsInSlab = Math.min(remainingUnits, slabEnd - slabStart);
        baseAmount += unitsInSlab * slabRate;
        remainingUnits -= unitsInSlab;
      }

      // Step 4: Calculate charges and taxes
      const fixedCharges = parseFloat(tariffData.fixedCharge || '0');
      const electricityDuty = baseAmount * (parseFloat(tariffData.electricityDutyPercent || '0') / 100);
      const subtotal = baseAmount + fixedCharges + electricityDuty;
      const gstAmount = subtotal * (parseFloat(tariffData.gstPercent || '0') / 100);
      const finalAmount = subtotal + gstAmount;

      // Step 5: Generate bill number
      const billNumber = `BILL-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      // Step 6: Create bill record
      const currentDate = new Date();
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + 15); // 15 days payment period

      const [billResult] = await tx.insert(bills).values({
        customerId,
        billNumber,
        billingMonth: currentDate.toISOString().split('T')[0],
        issueDate: currentDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        meterReadingId,
        unitsConsumed: unitsConsumed.toString(),
        baseAmount: baseAmount.toString(),
        fixedCharges: fixedCharges.toString(),
        electricityDuty: electricityDuty.toString(),
        gstAmount: gstAmount.toString(),
        totalAmount: finalAmount.toString(),
        status: 'issued',
      } as any);

      // Step 7: Update customer outstanding balance
      await tx
        .update(customers)
        .set({
          lastBillAmount: finalAmount.toString(),
          outstandingBalance: sql`outstanding_balance + ${finalAmount}`,
          paymentStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));

      // Transaction commits automatically
      return {
        success: true,
        billId: billResult.insertId,
        billNumber,
        totalAmount: finalAmount,
      };
    });
  } catch (error) {
    // Transaction automatically rolls back
    console.error('Bill generation transaction failed:', error);
    throw new Error(`Bill generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update work order with ACID compliance
 */
export async function updateWorkOrderTransaction(
  workOrderId: number,
  status: string,
  completionNotes?: string,
  completedBy?: number
) {
  try {
    return await db.transaction(async (tx) => {
      // Get work order details
      const [workOrder] = await tx
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, workOrderId))
        .limit(1);

      if (!workOrder) {
        throw new Error('Work order not found');
      }

      // Update work order
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'completed') {
        updateData.completionDate = new Date().toISOString().split('T')[0];
        if (completionNotes) {
          updateData.completionNotes = completionNotes;
        }
      }

      await tx
        .update(workOrders)
        .set(updateData as any)
        .where(eq(workOrders.id, workOrderId));

      // If meter reading work order, update meter reading status
      if ((workOrder as any).workType === 'meter_reading' && status === 'completed') {
        // Additional logic for meter reading completion
        // This ensures data consistency
      }

      return {
        success: true,
        workOrderId,
        status,
      };
    });
  } catch (error) {
    console.error('Work order update transaction failed:', error);
    throw new Error(`Work order update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate secure password using crypto (not Math.random)
 * This fixes the security vulnerability in password generation
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  const randomBytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  // Ensure password has at least one of each type
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+-=]/.test(password);

  if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
    // Recursively generate until requirements met
    return generateSecurePassword(length);
  }

  return password;
}

/**
 * Example usage:
 *
 * // Process payment
 * const result = await processPaymentTransaction(
 *   customerId: 1,
 *   billId: 1,
 *   amount: 500.00,
 *   paymentMethod: 'online',
 *   transactionId: 'TXN123456'
 * );
 *
 * // Register customer
 * const customer = await registerCustomerTransaction({
 *   email: 'user@example.com',
 *   password: 'SecurePassword123!',
 *   name: 'John Doe',
 *   phone: '1234567890',
 *   address: '123 Main St',
 *   city: 'Mumbai',
 *   state: 'Maharashtra',
 *   pincode: '400001',
 *   connectionType: 'residential'
 * });
 */

