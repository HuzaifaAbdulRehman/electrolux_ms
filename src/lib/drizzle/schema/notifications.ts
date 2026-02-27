import { mysqlTable, varchar, timestamp, int, text, mysqlEnum } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const notifications = mysqlTable('notifications', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationType: mysqlEnum('notification_type', ['billing', 'payment', 'usage', 'outage', 'service', 'reminder', 'system', 'maintenance', 'alert', 'info', 'work_order']).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  priority: mysqlEnum('priority', ['low', 'normal', 'medium', 'high']).default('normal').notNull(),
  actionUrl: varchar('action_url', { length: 255 }),
  actionText: varchar('action_text', { length: 100 }),
  isRead: int('is_read').default(0).notNull(), // 0 = unread, 1 = read
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

