import { mysqlTable, varchar, int, date, text, timestamp, mysqlEnum, index } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { workOrders } from './workOrders';

export const readingRequests = mysqlTable('reading_requests', {
  id: int('id').autoincrement().primaryKey(),
  requestNumber: varchar('request_number', { length: 50 }).notNull().unique(),
  customerId: int('customer_id').references(() => customers.id).notNull(),
  requestDate: timestamp('request_date').defaultNow().notNull(),
  preferredDate: date('preferred_date'),
  requestReason: text('request_reason'),
  priority: mysqlEnum('priority', ['normal', 'urgent']).default('normal').notNull(),
  status: mysqlEnum('status', ['pending', 'assigned', 'completed', 'cancelled']).default('pending').notNull(),
  notes: text('notes'),
  workOrderId: int('work_order_id').references(() => workOrders.id), // Nullable - null until assigned
  assignedDate: timestamp('assigned_date'),
  completedDate: timestamp('completed_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => {
  return {
    statusIdx: index('idx_status').on(table.status),
    customerIdx: index('idx_customer_id').on(table.customerId),
    requestDateIdx: index('idx_request_date').on(table.requestDate),
  };
});

// Type exports
export type ReadingRequest = typeof readingRequests.$inferSelect;
export type NewReadingRequest = typeof readingRequests.$inferInsert;
