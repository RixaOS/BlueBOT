import { ApplicationCommandType } from "discord.js";
import { createCommand } from "../../create-command.ts";

export const queueCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "queue",
  description: "Shows the current music queue",
  async execute(interaction, { musicPlayer }) {
    const queueList = musicPlayer.getQueue(interaction.guild!.id);
    if (!queueList.length) {
      await interaction.reply("🎵 The queue is empty.");
      return;
    }

    const formattedQueue = queueList
      .map((song, index) => `**${index + 1}.** ${song.title}`)
      .join("\n");

    await interaction.reply(`🎵 **Queue:**\n${formattedQueue}`);
  },
});
