import { ApplicationCommandType } from "discord.js";
import { createCommand } from "../../create-command.ts";

export const skipCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "skip",
  description: "Skips the current song",
  async execute(interaction, { musicPlayer }) {
    const success = musicPlayer.skip(interaction.guild!.id);
    await interaction.reply(
      success ? "⏭️ Skipped the song." : "❌ No song to skip.",
    );
  },
});
