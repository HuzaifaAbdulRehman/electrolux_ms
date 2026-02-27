import { mysqlTable, varchar, timestamp, int, text, mysqlEnum } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { employees } from './employees';

export const complaints = mysqlTable('complaints', {
  id: int('id').primaryKey().autoincrement(),
  customerId: int('customer_id').references(() => customers.id).notNull(),
  employeeId: int('employee_id').references(() => employees.id), // Nullable - complaints can be unassigned
  workOrderId: int('work_order_id'), // Links to work order when created
  category: mysqlEnum('category', ['power_outage', 'billing', 'service', 'meter_issue', 'connection', 'other']).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: mysqlEnum('status', ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed']).default('submitted').notNull(),
  priority: mysqlEnum('priority', ['low', 'medium', 'high', 'urgent']).default('medium').notNull(),
  resolutionNotes: text('resolution_notes'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  assignedAt: timestamp('assigned_at'),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Complaint = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;

