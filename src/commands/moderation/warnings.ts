import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import fs from "fs";
import path from "path";

export const warnings = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "warnings",
  description: "View all warnings or a specific user's warning history.",
  options: [
    {
      name: "user",
      description: "Optional user to filter warnings by",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  async execute(interaction) {
    const { guildId } = interaction;
    if (!guildId) return;

    const userOption = interaction.options.getUser("user");
    const filePath = path.resolve(
      `src/data/moderation/warnings_${guildId}.json`,
    );

    if (!fs.existsSync(filePath)) {
      await interaction.reply({
        content: "📁 No warnings file found for this server.",
        ephemeral: true,
      });
      return;
    }

    const allWarnings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const filtered = userOption
      ? allWarnings.filter((w: any) => w.userId === userOption.id)
      : allWarnings;

    if (!filtered.length) {
      await interaction.reply({
        content: userOption
          ? `✅ No warnings found for <@${userOption.id}>.`
          : `✅ No warnings have been issued in this server.`,
        ephemeral: true,
      });
      return;
    }

    // Pagination setup
    const warningsPerPage = 5;
    let currentPage = 0;
    const totalPages = Math.ceil(filtered.length / warningsPerPage);

    const buildEmbed = async () => {
      const embed = new EmbedBuilder()
        .setTitle(
          userOption
            ? `⚠️ Warnings for ${userOption.tag}`
            : `⚠️ All Warnings in ${interaction.guild?.name}`,
        )
        .setColor(Colors.Orange)
        .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` })
        .setTimestamp();

      const pageItems = filtered.slice(
        currentPage * warningsPerPage,
        (currentPage + 1) * warningsPerPage,
      );

      for (const warn of pageItems) {
        const mod = await interaction.guild?.members
          .fetch(warn.modId)
          .catch(() => null);
        const modTag = mod?.user.tag ?? warn.modId;

        embed.addFields({
          name: `🗓️ ${new Date(warn.timestamp).toLocaleString()}`,
          value: `**User:** <@${warn.userId}>\n**Reason:** ${warn.reason}\n**By:** ${modTag}`,
        });
      }

      return embed;
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀️ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),

      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1),
    );

    const reply = await interaction.reply({
      embeds: [await buildEmbed()],
      components: [row],
      ephemeral: true,
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000, // 1 minute
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: "You can't use this button.",
          ephemeral: true,
        });
        return;
      }

      if (i.customId === "prev" && currentPage > 0) currentPage--;
      if (i.customId === "next" && currentPage < totalPages - 1) currentPage++;

      const newEmbed = await buildEmbed();
      const prev = row.components.at(0);
      const next = row.components.at(1);

      const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ButtonBuilder.from(prev!).setDisabled(currentPage === 0),
        ButtonBuilder.from(next!).setDisabled(currentPage === totalPages - 1),
      );

      await i.update({ embeds: [newEmbed], components: [newRow] });
    });

    collector.on("end", async () => {
      const prev = row.components.at(0);
      const next = row.components.at(1);
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ButtonBuilder.from(prev!).setDisabled(true),
        ButtonBuilder.from(next!).setDisabled(true),
      );
      await reply.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
});
