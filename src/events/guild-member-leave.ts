import { Events, Colors, EmbedBuilder } from "discord.js";
import { createEvent } from "../create-event.ts";
import { getServerConfig } from "../config.ts";

export const guildMemberRemove = createEvent({
  name: Events.GuildMemberRemove,
  async execute(member) {
    const logChannelId = getServerConfig(member.guild.id, "logChannelId");
    const logChannel = member.guild.channels.cache.get(logChannelId ?? "");

    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle("📤 Member Left")
      .setColor(Colors.Red)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "👤 User",
          value: `${member.user.tag} (${member.id})`,
          inline: true,
        },
        { name: "🕓 Left At", value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
      )
      .setFooter({ text: `User ID: ${member.id}` });

    await logChannel.send({ embeds: [embed] });
  },
});
