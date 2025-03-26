import { Events, Message, EmbedBuilder, TextChannel } from "discord.js";
import type { PartialMessage } from "discord.js";
import { createEvent } from "../create-event.ts";
import { config } from "../config.ts";

export const messageUpdate = createEvent({
  name: Events.MessageUpdate,
  async execute(
    oldMsg: Message | PartialMessage,
    newMsg: Message | PartialMessage,
    context,
  ) {
    const { logger } = context;

    logger.info("✏️ messageUpdate event fired!");

    if (!newMsg.guild || newMsg.guild.id !== config.DISCORD_DEV_GUILD_ID)
      return;

    // ✅ Step 1: Fetch if partial
    try {
      if (oldMsg.partial) await oldMsg.fetch();
      if (newMsg.partial) await newMsg.fetch();
    } catch (err) {
      logger.warn("⚠️ Could not fetch partial messages:", err);
    }

    // ✅ Step 2: Try backup fetch if author is missing
    if (!oldMsg.author) {
      try {
        const channel = await newMsg.client.channels.fetch(oldMsg.channelId);
        if (channel?.isTextBased()) {
          const fetched = await (channel as TextChannel).messages.fetch(
            oldMsg.id,
          );
          if (fetched.author) oldMsg = fetched;
        }
      } catch (err) {
        logger.warn("⚠️ Could not fetch oldMsg for author recovery:", err);
      }
    }

    const oldContent = oldMsg.content?.trim() || "";
    const newContent = newMsg.content?.trim() || "";

    if (oldContent === newContent) {
      logger.info("⏭️ No content change detected (after trim).");
      return;
    }

    // ✅ Step 4: Build values (with fallbacks)
    const authorTag = oldMsg.author?.tag ?? "Unknown User";
    const authorId = oldMsg.author?.id ?? "unknown";
    const avatar = oldMsg.author?.displayAvatarURL() ?? null;

    const messageLink = newMsg.guild
      ? `[Click to view](https://discord.com/channels/${newMsg.guild.id}/${newMsg.channelId}/${newMsg.id})`
      : "*Unavailable*";

    const embed = new EmbedBuilder()
      .setTitle("✏️ Message Edited")
      .setColor("Yellow")
      .setAuthor({
        name: authorTag,
        ...(avatar && { iconURL: avatar }), // ✅ TS-safe
      })
      .addFields(
        { name: "User", value: `<@${authorId}>`, inline: true },
        { name: "Channel", value: `<#${newMsg.channelId}>`, inline: true },
        { name: "Jump to Message", value: messageLink },
        { name: "Before", value: oldContent.slice(0, 1024) },
        { name: "After", value: newContent.slice(0, 1024) },
      )
      .setTimestamp();

    // ✅ Step 5: Send to log channel
    const logChannelId = config.LOG_CHANNEL_ID || "YOUR_DEFAULT_LOG_CHANNEL_ID";
    const channel = newMsg.guild.channels.cache.get(logChannelId);

    if (!channel?.isTextBased()) {
      logger.warn("⚠️ Log channel missing or not text-based.");
      return;
    }

    try {
      await channel.send({ embeds: [embed] });
      logger.info("✅ Message edit logged.");
    } catch (err) {
      logger.error("❌ Failed to send edit log:", err);
    }
  },
});
