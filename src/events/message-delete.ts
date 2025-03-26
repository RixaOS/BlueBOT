import { Events, Message, EmbedBuilder } from "discord.js";
import type { PartialMessage } from "discord.js";
import { createEvent } from "../create-event.ts";
import { config } from "../config.ts";

export const messageDelete = createEvent({
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage) {
    if (!message.guild || message.guild.id !== config.DISCORD_DEV_GUILD_ID)
      return;
    if (!message.author || message.author.bot) return;

    const logChannelId = config.LOG_CHANNEL_ID || "135388766789123456";
    const channel = message.guild.channels.cache.get(logChannelId);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Message Deleted")
      .setColor("Red")
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL(),
      })
      .addFields(
        { name: "User", value: `<@${message.author.id}>`, inline: true },
        { name: "Channel", value: `<#${message.channelId}>`, inline: true },
        {
          name: "Message",
          value: message.content?.slice(0, 1024) || "*no content or uncached*",
        },
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
});
