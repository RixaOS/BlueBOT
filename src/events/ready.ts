import { Events } from "discord.js";
import { createEvent } from "../create-event.ts";
import { config } from "../config.ts";
import * as commands from "../commands/mod.ts";

export const readyEvent = createEvent({
  name: Events.ClientReady,
  async execute(client, context) {
    const devGuild = config.DISCORD_DEV_GUILD_ID
      ? client.guilds.cache.get(config.DISCORD_DEV_GUILD_ID)
      : undefined;

    if (config.NODE_ENV !== "production") {
      await client.application.commands.set([]);
      await devGuild?.commands.set(Object.values(commands));
    } else {
      await client.application.commands.set(Object.values(commands));
      await devGuild?.commands.set([]);
    }

    context.logger.info(`Deployed ${Object.values(commands).length} commands.`);
    context.logger.info(`${client.user.username} is ready.`);
  },
});
