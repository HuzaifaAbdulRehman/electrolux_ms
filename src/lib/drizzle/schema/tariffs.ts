import { mysqlTable, varchar, timestamp, int, decimal, date, mysqlEnum } from 'drizzle-orm/mysql-core';

export const tariffs = mysqlTable('tariffs', {
  id: int('id').primaryKey().autoincrement(),
  category: mysqlEnum('category', ['Residential', 'Commercial', 'Industrial', 'Agricultural']).notNull(),
  fixedCharge: decimal('fixed_charge', { precision: 10, scale: 2 }).notNull(), // Monthly fixed charge
  // Removed all slab1-5 columns. Use tariff_slabs child table instead.

  // Time of Use rates (optional advanced pricing)
  timeOfUsePeakRate: decimal('time_of_use_peak_rate', { precision: 10, scale: 2 }),
  timeOfUseNormalRate: decimal('time_of_use_normal_rate', { precision: 10, scale: 2 }),
  timeOfUseOffpeakRate: decimal('time_of_use_offpeak_rate', { precision: 10, scale: 2 }),

  // Additional charges
  electricityDutyPercent: decimal('electricity_duty_percent', { precision: 5, scale: 2 }).default('0.00'), // e.g., 6%
  gstPercent: decimal('gst_percent', { precision: 5, scale: 2 }).default('18.00'), // e.g., 18%

  effectiveDate: date('effective_date').notNull(),
  validUntil: date('valid_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Tariff = typeof tariffs.$inferSelect;
export type NewTariff = typeof tariffs.$inferInsert;

