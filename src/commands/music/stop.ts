import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
} from "discord.js";
import { createCommand } from "../../create-command.ts";

export const stopCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "stop",
  description: "Stops the music and clears the queue",
  async execute(interaction: ChatInputCommandInteraction, { musicPlayer }) {
    if (!interaction.guild) {
      await interaction.reply("❌ This command can only be used in a server.");
      return;
    }

    musicPlayer.stop(interaction.guild.id);
    await interaction.reply("⏹️ Music stopped and queue cleared.");
  },
});
