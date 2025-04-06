import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import fs from "fs";
import path from "path";
import { getServerConfig } from "../../config.ts";

export const warn = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "warn",
  description: "Manually issue a warning to a user.",
  options: [
    {
      name: "user",
      description: "The user to warn",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the warning",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction) {
    const { guildId, user } = interaction;
    if (!guildId) return;

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    const warningsFile = path.resolve(
      `src/data/moderation/warnings_${guildId}.json`,
    );
    if (!fs.existsSync("src/data/moderation"))
      fs.mkdirSync("src/data/moderation", { recursive: true });

    let warnings = [];
    try {
      if (fs.existsSync(warningsFile)) {
        warnings = JSON.parse(fs.readFileSync(warningsFile, "utf-8"));
      } else {
        fs.writeFileSync(warningsFile, "[]");
      }
    } catch (err) {
      console.error("❌ Could not load warning file:", err);
      await interaction.reply({
        content: "❌ Failed to load or create warning file.",
        ephemeral: true,
      });
      return;
    }

    const entry = {
      userId: target.id,
      modId: user.id,
      timestamp: Date.now(),
      message: "Manual warning",
      reason,
    };

    warnings.push(entry);
    fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));

    // 🔔 Notify the user in the notify channel
    const notifyChannelId = getServerConfig(guildId, "notifyChannelId");
    const notifyChannel = interaction.guild?.channels.cache.get(
      notifyChannelId ?? "",
    );

    if (notifyChannel?.isTextBased()) {
      await notifyChannel.send({
        content: `<@${target.id}> you have been warned.\n**Reason:** ${reason}`,
      });
    }

    // ✅ Confirm to the mod
    await interaction.reply({
      content: `⚠️ <@${target.id}> has been warned for:\n> ${reason}`,
      ephemeral: true,
    });

    // 🔍 Optionally: Log to mod log channel
    const logChannelId = getServerConfig(guildId, "logChannelId");
    const logChannel = interaction.guild?.channels.cache.get(
      logChannelId ?? "",
    );
    if (logChannel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Manual Warning Issued")
        .setColor(Colors.Red)
        .addFields(
          { name: "👤 User", value: `<@${target.id}>`, inline: true },
          { name: "🧾 Reason", value: reason },
          { name: "🛡️ Moderator", value: `${user.tag}`, inline: true },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  },
});
