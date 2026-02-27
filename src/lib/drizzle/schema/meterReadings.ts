import { mysqlTable, varchar, timestamp, int, decimal, date, text, mysqlEnum } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { employees } from './employees';

export const meterReadings = mysqlTable('meter_readings', {
  id: int('id').primaryKey().autoincrement(),
  customerId: int('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  meterNumber: varchar('meter_number', { length: 50 }).notNull(),
  currentReading: decimal('current_reading', { precision: 10, scale: 2 }).notNull(), // kWh
  previousReading: decimal('previous_reading', { precision: 10, scale: 2 }).notNull(), // kWh
  unitsConsumed: decimal('units_consumed', { precision: 10, scale: 2 }).notNull(), // current - previous
  readingDate: date('reading_date').notNull(),
  readingTime: timestamp('reading_time').notNull(),
  meterCondition: mysqlEnum('meter_condition', ['good', 'fair', 'poor', 'damaged']).default('good').notNull(),
  accessibility: mysqlEnum('accessibility', ['accessible', 'partially_accessible', 'inaccessible']).default('accessible').notNull(),
  employeeId: int('employee_id').references(() => employees.id), // Who took the reading
  photoPath: varchar('photo_path', { length: 500 }), // Path to meter photo
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type MeterReading = typeof meterReadings.$inferSelect;
export type NewMeterReading = typeof meterReadings.$inferInsert;

