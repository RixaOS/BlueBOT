import { Events, TextChannel } from "discord.js";
import { config } from "../config.ts";
import { createEvent } from "../create-event.ts";

export const guildMemberUpdate = createEvent({
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, context) {
    const { logger } = context;

    logger.info("📣 guildMemberUpdate triggered!");

    // ✅ Alleen in specifieke guild
    if (newMember.guild.id !== config.DISCORD_DEV_GUILD_ID) {
      logger.info("❌ Guild mismatch. Skipping.");
      return;
    }

    // 🎯 Hardcoded role & channel ID :DDD pls dont see this
    const ROLE_ID = "1353867086933524540";
    const CHANNEL_ID = "1353866877260271616";

    const hadRole = oldMember.roles.cache.has(ROLE_ID);
    const hasRole = newMember.roles.cache.has(ROLE_ID);

    // ✅ Rol is nieuw toegevoegd
    if (!hadRole && hasRole) {
      const channel = newMember.guild.channels.cache.get(CHANNEL_ID);

      if (!channel) {
        logger.warn(`⚠️ Channel with ID ${CHANNEL_ID} not found.`);
        return;
      }

      if (!channel.isTextBased()) {
        logger.warn(`⚠️ Channel ${channel.id} is not a text channel.`);
        return;
      }

      const textChannel = channel as TextChannel;

      try {
        await textChannel.send({
          content: `🎪 Welcome ${newMember} as new clown in the circus 🤡`,
        });
      } catch (err) {
        logger.error("❌ Error sending the message:", err);
      }
    }
  },
});
