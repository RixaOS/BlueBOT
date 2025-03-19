import { ApplicationCommandType } from "discord.js";
import { createCommand } from "../../create-command.ts";

export const stopCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "stop",
  description: "Stops the music and clears the queue",
  async execute(interaction, { musicPlayer }) {
    musicPlayer.stop(interaction.guild!.id);
    await interaction.reply("⏹️ Music stopped and queue cleared.");
  },
});
