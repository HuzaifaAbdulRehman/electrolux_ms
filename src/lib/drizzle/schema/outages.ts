import { mysqlTable, varchar, text, int, datetime, mysqlEnum, timestamp } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const outages = mysqlTable('outages', {
  id: int('id').primaryKey().autoincrement(),
  areaName: varchar('area_name', { length: 255 }).notNull(),
  zone: varchar('zone', { length: 50 }).notNull(), // Simple zone like "Zone A", "Zone B"
  
  outageType: mysqlEnum('outage_type', ['planned', 'unplanned']).notNull(),
  reason: text('reason'),
  severity: mysqlEnum('severity', ['low', 'medium', 'high', 'critical']).notNull(),
  
  scheduledStartTime: datetime('scheduled_start_time'),
  scheduledEndTime: datetime('scheduled_end_time'),
  actualStartTime: datetime('actual_start_time'),
  actualEndTime: datetime('actual_end_time'),
  
  affectedCustomerCount: int('affected_customer_count').default(0),
  status: mysqlEnum('status', ['scheduled', 'ongoing', 'restored', 'cancelled']).notNull(),
  restorationNotes: text('restoration_notes'),
  
  createdBy: int('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Outage = typeof outages.$inferSelect;
export type NewOutage = typeof outages.$inferInsert;

