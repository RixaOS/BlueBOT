import { Events, Colors, EmbedBuilder } from "discord.js";
import { createEvent } from "../create-event.ts";
import { getServerConfig } from "../config.ts";

export const guildMemberAdd = createEvent({
  name: Events.GuildMemberAdd,
  async execute(member) {
    const logChannelId = getServerConfig(member.guild.id, "logChannelId");
    const logChannel = member.guild.channels.cache.get(logChannelId ?? "");

    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle("📥 Member Joined")
      .setColor(Colors.Green)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "👤 User",
          value: `<@${member.id}> (${member.user.tag})`,
          inline: true,
        },
        {
          name: "🕓 Joined At",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        },
      )
      .setFooter({ text: `User ID: ${member.id}` });

    await logChannel.send({ embeds: [embed] });
  },
});
