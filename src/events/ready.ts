import { Events, TextChannel } from "discord.js";
import { createEvent } from "../create-event.ts";
import { config } from "../config.ts";
import * as commands from "../commands/mod.ts";

export const readyEvent = createEvent({
  name: Events.ClientReady,
  async execute(client, context) {
    const { logger } = context;

    logger.info("✅ Bot is ready — fetching message cache...");

    try {
      const guild = await client.guilds.fetch(config.DISCORD_DEV_GUILD_ID!);

      for (const [, channel] of guild.channels.cache) {
        if (!channel.isTextBased()) continue;

        try {
          await (channel as TextChannel).messages.fetch({
            limit: 100,
          });
          logger.info(`📥 Cached messages from #${channel.name}`);
        } catch (err) {
          logger.info(
            `⚠️ Failed to fetch messages in #${channel.name} or there aren't any messages`,
          );
        }
      }

      logger.info("📦 Initial message cache primed.");
    } catch (err) {
      logger.error("❌ Failed to preload message cache:", err);
    }

    const devGuild = config.DISCORD_DEV_GUILD_ID
      ? client.guilds.cache.get(config.DISCORD_DEV_GUILD_ID)
      : undefined;

    if (config.NODE_ENV !== "production") {
      await client.application.commands.set([]);
      await devGuild?.commands.set(Object.values(commands));
    } else {
      await devGuild?.commands.set([]);
      await client.application.commands.set(Object.values(commands));
    }

    context.logger.info(`Deployed ${Object.values(commands).length} commands.`);
    context.logger.info(`${client.user.username} is ready.`);
  },
});
