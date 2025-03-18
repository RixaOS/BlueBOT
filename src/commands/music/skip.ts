import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
} from "discord.js";
import { createCommand } from "../../create-command.ts";

export const skipCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "skip",
  description: "Skips the current song",
  async execute(interaction: ChatInputCommandInteraction, { musicPlayer }) {
    if (!interaction.guild) {
      await interaction.reply("❌ This command can only be used in a server.");
      return;
    }

    const success = musicPlayer.skip(interaction.guild.id);
    await interaction.reply(
      success ? "⏭️ Skipped the song." : "❌ No song to skip.",
    );
  },
});
