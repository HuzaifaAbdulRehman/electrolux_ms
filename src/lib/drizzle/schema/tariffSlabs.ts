import { mysqlTable, int, decimal, timestamp } from 'drizzle-orm/mysql-core';
import { tariffs } from './tariffs';

export const tariffSlabs = mysqlTable('tariff_slabs', {
  id: int('id').primaryKey().autoincrement(),
  tariffId: int('tariff_id').notNull().references(() => tariffs.id, { onDelete: 'cascade' }),
  slabOrder: int('slab_order').notNull(),
  startUnits: int('start_units').notNull(),
  endUnits: int('end_units'),
  ratePerUnit: decimal('rate_per_unit', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TariffSlab = typeof tariffSlabs.$inferSelect;
export type NewTariffSlab = typeof tariffSlabs.$inferInsert;



