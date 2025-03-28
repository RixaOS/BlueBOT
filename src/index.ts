import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Options,
} from "discord.js";
import { config } from "./config.ts";
import { pino, type Logger } from "pino";
import * as events from "./events/mod.ts";
// import { MusicPlayer } from "./music/player.ts";
// import { initLavalink } from "./services/lavalink.ts";

export type Context = {
  logger: Logger;
  // musicPlayer: MusicPlayer;
};

const logger = pino({ name: config.npm_package_name });
// export const musicPlayer = new MusicPlayer();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message],
  makeCache: Options.cacheWithLimits({
    MessageManager: 100, // Cache last 100 messages per channel
  }),
  // Note: Sweepers in case the cache gets too much for the bot but it shouldn't for 1 server.
  // Note: Future dev: Use a database instead of caching to watch all messages
  // sweepers: {
  //   messages: {
  //     interval: 300, // Run sweeper every 5 minutes
  //     lifetime: 600, // Remove messages older than 10 minutes
  //   },
  // },
});

// initLavalink(client);

Object.values(events).forEach(({ name, execute }) => {
  const eventListenerType = name === Events.ClientReady ? "once" : "on";

  client[eventListenerType](name, (...args) =>
    // @ts-expect-error https://github.com/microsoft/TypeScript/issues/30581
    execute(...args, {
      logger,
      // musicPlayer
    }),
  );
});

await client.login(config.DISCORD_TOKEN);
