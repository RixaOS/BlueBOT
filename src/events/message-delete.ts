import { Events, EmbedBuilder } from "discord.js";
import { createEvent } from "../create-event.ts";
import { getServerConfig } from "../config.ts";

export const messageDelete = createEvent({
  name: Events.MessageDelete,
  async execute(message) {
    const guildId = message.guildId!;
    const logChannelId = getServerConfig(guildId, "logChannelId");
    if (!logChannelId) return;
    if (!message.guild) return; // exit early if it's a DM
    if (!message.author) return;

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
