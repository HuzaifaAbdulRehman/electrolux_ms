import { mysqlTable, varchar, timestamp, int, text, mysqlEnum } from 'drizzle-orm/mysql-core';

export const systemSettings = mysqlTable('system_settings', {
  id: int('id').primaryKey().autoincrement(),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: text('setting_value'),
  category: mysqlEnum('category', ['general', 'billing', 'security', 'system', 'electricity', 'tariffs', 'notifications']).notNull(),
  dataType: mysqlEnum('data_type', ['string', 'number', 'boolean']).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

