import { Shoukaku, Connectors, type NodeOption } from "shoukaku";
import { Client } from "discord.js";

const nodes: NodeOption[] = [
  {
    name: "main",
    url: "localhost:2333",
    auth: "youshallnotpass",
    secure: false,
  },
];

let shoukaku: Shoukaku;

export function initLavalink(client: Client) {
  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes);

  shoukaku.on("ready", (name) =>
    console.log(`✅ Lavalink node "${name}" is ready.`),
  );
  shoukaku.on("error", (name, error) =>
    console.error(`❌ Lavalink error on "${name}":`, error),
  );
  shoukaku.on("close", (name, code, reason) =>
    console.warn(`⚠️ Lavalink "${name}" closed: ${code} - ${reason}`),
  );
}

export { shoukaku };
