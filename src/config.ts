import { z } from "zod";

const schema = z.object({
  DISCORD_TOKEN: z.string(),
  npm_package_name: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DISCORD_DEV_GUILD_ID: z.string().optional(),
  LOG_CHANNEL_ID: z.string().optional(),
  OWNER_ID: z.string().optional(),
  MOD_ID: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  throw new Error(result.error.message);
}

export const config = result.data;
