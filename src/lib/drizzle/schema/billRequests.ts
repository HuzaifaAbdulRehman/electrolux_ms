import { mysqlTable, varchar, int, date, text, timestamp, mysqlEnum, decimal, uniqueIndex } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { users } from './users';

export const billRequests = mysqlTable('bill_requests', {
  id: int('id').autoincrement().primaryKey(),
  requestId: varchar('request_id', { length: 50 }).notNull().unique(),
  customerId: int('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  billingMonth: date('billing_month').notNull(),
  priority: mysqlEnum('priority', ['low', 'medium', 'high']).default('medium'),
  notes: text('notes'),
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'rejected']).default('pending'),
  requestDate: date('request_date').notNull(),
  createdBy: int('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    uniqueRequestMonth: uniqueIndex('unique_request_month').on(table.customerId, table.billingMonth),
  };
});

// Type exports
export type BillRequest = typeof billRequests.$inferSelect;
export type NewBillRequest = typeof billRequests.$inferInsert;

