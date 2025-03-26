import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  GuildMember,
} from "discord.js";
import { createCommand } from "../../create-command.ts";

export const playCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "play",
  description: "Plays a song from YouTube",
  options: [
    {
      name: "query",
      type: ApplicationCommandOptionType.String,
      description: "YouTube URL or search term",
      required: true,
    },
  ],
  async execute(interaction, context) {
    console.log("🔍 Debug: musicPlayer in play.ts:", context);
    const query = interaction.options.getString("query", true);
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
      await interaction.reply(
        "❌ You need to be in a voice channel to play music.",
      );
      return;
    }

    try {
      // ✅ Ensure only ONE reply is sent
      await interaction.deferReply(); // ✅ Defers response to avoid timeout issues

      const response = await context.musicPlayer.play(
        interaction.guild,
        member,
        query,
      );

      if (interaction.replied || interaction.deferred) {
        // ✅ Ensure we don't send a second reply
        await interaction.editReply(response);
      }
    } catch (error) {
      console.error("❌ Error in play command:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(
          "⚠️ An error occurred while trying to play the song.",
        );
      } else {
        await interaction.editReply(
          "⚠️ An error occurred while trying to play the song.",
        );
      }
    }
  },
});
