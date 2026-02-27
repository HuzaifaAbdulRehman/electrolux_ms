import { mysqlTable, varchar, int, text, timestamp, mysqlEnum, index } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const passwordResetRequests = mysqlTable('password_reset_requests', {
  id: int('id').primaryKey().autoincrement(),
  requestNumber: varchar('request_number', { length: 50 }).notNull().unique(), // PWRST-2025-XXXXX
  userId: int('user_id').references(() => users.id, { onDelete: 'cascade' }), // Nullable initially
  email: varchar('email', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }), // For customers (optional)
  userType: mysqlEnum('user_type', ['employee', 'customer']).notNull(),
  requestReason: text('request_reason'), // Optional: why they need reset

  status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'completed']).default('pending').notNull(),

  // Temporary password (hashed version stored in users.password)
  tempPasswordPlain: varchar('temp_password_plain', { length: 255 }), // Encrypted for admin display

  // Timestamps
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  processedBy: int('processed_by').references(() => users.id), // Admin who processed
  expiresAt: timestamp('expires_at'), // Temp password expiration

  // Rejection
  rejectionReason: text('rejection_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => {
  return {
    statusIdx: index('idx_status').on(table.status),
    emailIdx: index('idx_email').on(table.email),
    userIdIdx: index('idx_user_id').on(table.userId),
  };
});

export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;
export type NewPasswordResetRequest = typeof passwordResetRequests.$inferInsert;
