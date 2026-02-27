import { mysqlTable, varchar, timestamp, int, decimal, date, text, mysqlEnum } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { bills } from './bills';

export const payments = mysqlTable('payments', {
  id: int('id').primaryKey().autoincrement(),
  customerId: int('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  billId: int('bill_id').references(() => bills.id),
  paymentAmount: decimal('payment_amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum('payment_method', ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'cheque', 'upi', 'wallet']).notNull(),
  paymentDate: date('payment_date').notNull(),
  transactionId: varchar('transaction_id', { length: 100 }).unique(),
  receiptNumber: varchar('receipt_number', { length: 50 }).unique(),
  status: mysqlEnum('status', ['pending', 'completed', 'failed', 'refunded']).default('completed').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

