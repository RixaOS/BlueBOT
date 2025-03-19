import { ApplicationCommandType } from "discord.js";
import { createCommand } from "../../create-command.ts";

export const pauseCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "pause",
  description: "Pauses or resumes the current song",
  async execute(interaction, { musicPlayer }) {
    const isPaused = musicPlayer.togglePause(interaction.guild!.id);

    await interaction.reply(
      isPaused ? "⏸️ Music paused." : "▶️ Music resumed.",
    );
  },
});
