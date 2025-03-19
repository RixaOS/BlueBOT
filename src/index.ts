import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config.ts";
import { pino, type Logger } from "pino";
import * as events from "./events/mod.ts";
import { MusicPlayer } from "./music/player.ts";

export type Context = {
  logger: Logger;
  musicPlayer: MusicPlayer;
};

const logger = pino({ name: config.npm_package_name });
const musicPlayer = new MusicPlayer(); // ✅ Create musicPlayer instance

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

Object.values(events).forEach(({ name, execute }) => {
  const eventListenerType = name === Events.ClientReady ? "once" : "on";

  client[eventListenerType](name, (...args) =>
    // @ts-expect-error https://github.com/microsoft/TypeScript/issues/30581
    execute(...args, { logger, musicPlayer }),
  );
});

await client.login(config.DISCORD_TOKEN);
