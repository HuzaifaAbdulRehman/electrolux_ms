import { mysqlTable, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./users";

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  cnic: varchar("cnic", { length: 15 }).unique(),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 500 }),
  meterNumber: varchar("meter_number", { length: 50 }).unique(),
  connectionType: mysqlEnum("connection_type", ["residential", "commercial", "industrial"]).default("residential"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
