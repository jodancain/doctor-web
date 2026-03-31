import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { logger } from "./logger";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable. Set it in .env file.");
}

// Parse DATABASE_URL to extract connection params
const url = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.replace("/", ""),
  connectionLimit: 10,
});

export const prisma = new PrismaClient({ adapter });

logger.info("Prisma MySQL client initialized");
