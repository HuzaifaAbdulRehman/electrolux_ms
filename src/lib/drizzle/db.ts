import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.DB_PASSWORD) {
  throw new Error("DB_PASSWORD is not set in .env.local");
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "electricity_ems",
});

export const db = drizzle(pool);
