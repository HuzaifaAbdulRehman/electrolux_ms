import { mysqlTable, varchar, timestamp, int, date, mysqlEnum } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const employees = mysqlTable('employees', {
  id: int('id').primaryKey().autoincrement(),
  employeeNumber: varchar('employee_number', { length: 20 }).unique(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  designation: varchar('designation', { length: 100 }).notNull(), // e.g., Meter Reader, Supervisor, Technician
  department: varchar('department', { length: 100 }).notNull(), // e.g., Operations, Billing, Maintenance
  assignedZone: varchar('assigned_zone', { length: 100 }), // Geographic area assigned
  status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
  hireDate: date('hire_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

