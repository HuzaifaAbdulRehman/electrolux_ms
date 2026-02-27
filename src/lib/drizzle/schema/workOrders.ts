import { mysqlTable, varchar, timestamp, int, date, text, mysqlEnum } from 'drizzle-orm/mysql-core';
import { employees } from './employees';
import { customers } from './customers';

export const workOrders = mysqlTable('work_orders', {
  id: int('id').primaryKey().autoincrement(),
  employeeId: int('employee_id').references(() => employees.id), // Nullable - complaints can be unassigned
  customerId: int('customer_id').references(() => customers.id),
  workType: mysqlEnum('work_type', ['meter_reading', 'maintenance', 'complaint_resolution', 'new_connection', 'disconnection', 'reconnection']).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['assigned', 'in_progress', 'completed', 'cancelled']).default('assigned').notNull(),
  priority: mysqlEnum('priority', ['low', 'medium', 'high', 'urgent']).default('medium').notNull(),
  assignedDate: date('assigned_date').notNull(),
  dueDate: date('due_date').notNull(),
  completionDate: date('completion_date'),
  completionNotes: text('completion_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;

