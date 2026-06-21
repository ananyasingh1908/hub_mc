import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = mysql.createPool(connectionString);

export const db = drizzle(pool);