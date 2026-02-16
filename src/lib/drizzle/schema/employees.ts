import { mysqlTable, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./users";

export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  employeeNumber: varchar("employee_number", { length: 50 }).unique(),
  phone: varchar("phone", { length: 20 }),
  department: varchar("department", { length: 100 }),
  role: mysqlEnum("role", ["meter_reader", "technician", "billing_officer", "manager"]).default("meter_reader"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
