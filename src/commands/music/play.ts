import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import ytdl from "@distube/ytdl-core"; // ✅ Ensure correct import

export const playCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "play",
  description: "Plays a song from YouTube",
  options: [
    {
      name: "query",
      type: 3, // STRING
      description: "YouTube URL or search term",
      required: true,
    },
  ],
  async execute(interaction: ChatInputCommandInteraction, context) {
    console.log("🔍 Debug: musicPlayer in play.ts:", context.musicPlayer);

    if (!interaction.guild) {
      await interaction.reply("❌ This command can only be used in a server.");
      return;
    }

    const query = interaction.options.getString("query", true);
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
      await interaction.reply(
        "❌ You need to be in a voice channel to play music.",
      );
      return;
    }

    if (!ytdl.validateURL(query)) {
      await interaction.reply(
        "❌ Invalid YouTube URL. Please provide a valid link.",
      );
      return;
    }

    try {
      const response = await context.musicPlayer.play(
        interaction.guild,
        member,
        query,
      );
      await interaction.reply(response);
    } catch (error) {
      console.error("❌ Error in play command:", error);
      await interaction.reply(
        "⚠️ An error occurred while trying to play the song.",
      );
    }
  },
});
