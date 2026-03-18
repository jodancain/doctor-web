import cloudbase from "@cloudbase/node-sdk";
import { logger } from "./logger";

if (!process.env.CLOUDBASE_ENV_ID || !process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) {
  logger.error("Missing CloudBase credentials in environment variables.");
}

const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID as string,
  secretId: process.env.CLOUDBASE_SECRET_ID as string,
  secretKey: process.env.CLOUDBASE_SECRET_KEY as string,
});

export const db = app.database();
export const _ = db.command;
