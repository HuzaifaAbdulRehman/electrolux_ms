import { mysqlTable, varchar, timestamp, int, decimal, date, mysqlEnum } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const customers = mysqlTable('customers', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountNumber: varchar('account_number', { length: 50 }).notNull().unique(), // ELX-2024-XXXXXX
  meterNumber: varchar('meter_number', { length: 50 }).unique(), // MTR-XXX-XXXXXX (optional for new customers)
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  address: varchar('address', { length: 500 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  zone: varchar('zone', { length: 50 }), // Load shedding zone: Zone A, Zone B, Zone C, etc.
  connectionType: mysqlEnum('connection_type', ['Residential', 'Commercial', 'Industrial', 'Agricultural']).notNull(),
  status: mysqlEnum('status', ['pending_installation', 'active', 'suspended', 'inactive']).default('active').notNull(),
  connectionDate: date('connection_date').notNull(),
  dateOfBirth: date('date_of_birth'), // Customer's date of birth (optional)
  installationCharges: decimal('installation_charges', { precision: 10, scale: 2 }), // Same as estimatedCharges from connectionRequests
  lastBillAmount: decimal('last_bill_amount', { precision: 10, scale: 2 }).default('0.00'),
  lastPaymentDate: date('last_payment_date'),
  averageMonthlyUsage: decimal('average_monthly_usage', { precision: 10, scale: 2 }).default('0.00'), // kWh
  outstandingBalance: decimal('outstanding_balance', { precision: 10, scale: 2 }).default('0.00'),
  paymentStatus: mysqlEnum('payment_status', ['paid', 'pending', 'overdue']).default('paid').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

