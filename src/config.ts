import { z } from "zod";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configFile = path.join(__dirname, "data", "servers.json");

const schema = z.object({
  DISCORD_TOKEN: z.string(),
  npm_package_name: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DISCORD_DEV_GUILD_ID: z.string().optional(),
  OWNER_ID: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  OPENAPI_KEY: z.string().optional(),
});

export function getServerConfig(guildId: string, key: string): string | null {
  if (!fs.existsSync(configFile)) return null;

  const servers = JSON.parse(fs.readFileSync(configFile, "utf8"));
  return servers[guildId]?.[key] ?? null;
}

const result = schema.safeParse(process.env);

if (!result.success) {
  throw new Error(result.error.message);
}

export const config = result.data;

export const openai = new OpenAI({
  apiKey: config.OPENAPI_KEY,
});
