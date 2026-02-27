import { mysqlTable, varchar, timestamp, int, decimal, date, mysqlEnum } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { meterReadings } from './meterReadings';
import { tariffs } from './tariffs';

export const bills = mysqlTable('bills', {
  id: int('id').primaryKey().autoincrement(),
  customerId: int('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  billNumber: varchar('bill_number', { length: 50 }).notNull().unique(), // BILL-2024-XXXXXX
  billingMonth: date('billing_month').notNull(), // YYYY-MM-01 format
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),

  // Consumption details
  unitsConsumed: decimal('units_consumed', { precision: 10, scale: 2 }).notNull(), // kWh
  meterReadingId: int('meter_reading_id').references(() => meterReadings.id),

  // Billing breakdown
  baseAmount: decimal('base_amount', { precision: 10, scale: 2 }).notNull(), // units × tariff rate
  fixedCharges: decimal('fixed_charges', { precision: 10, scale: 2 }).notNull(),
  electricityDuty: decimal('electricity_duty', { precision: 10, scale: 2 }).default('0.00'),
  gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).default('0.00'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),

  // Payment tracking
  status: mysqlEnum('status', ['generated', 'issued', 'paid', 'overdue', 'cancelled']).default('generated').notNull(),
  paymentDate: date('payment_date'),

  // Audit trail - reference to tariff used for this bill
  tariffId: int('tariff_id').references(() => tariffs.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;

