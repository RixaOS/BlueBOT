import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config.ts";
import { pino, type Logger } from "pino";
import * as events from "./events/mod.ts";

export type Context = {
  logger: Logger;
};

const logger = pino({ name: config.npm_package_name });

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

Object.values(events).forEach(({ name, execute }) => {
  const eventListenerType = name === Events.ClientReady ? "once" : "on";

  // @ts-expect-error https://github.com/microsoft/TypeScript/issues/30581
  client[eventListenerType](name, (...args) => execute(...args, { logger }));
});

await client.login(config.DISCORD_TOKEN);
