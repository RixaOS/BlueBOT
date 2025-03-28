import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_DIR = path.join(__dirname, "..", "data");
const CONFIG_FILE = path.join(CONFIG_DIR, "servers.json");

export function isSetupComplete(guildId: string): boolean {
  if (!fs.existsSync(CONFIG_FILE)) return false;
  const servers = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  return Boolean(servers[guildId]?.modRoleId);
}
