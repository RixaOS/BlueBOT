// import {
//   ApplicationCommandType,
//   ApplicationCommandOptionType,
//   EmbedBuilder,
// } from "discord.js";
// import { createCommand } from "../../create-command.ts";

// export const play = createCommand({
//   type: ApplicationCommandType.ChatInput,
//   name: "play",
//   description: "Play a song from Spotify (via link or search).",
//   options: [
//     {
//       name: "query",
//       description: "Spotify track link or search term",
//       type: ApplicationCommandOptionType.String,
//       required: true,
//     },
//   ],

//   async execute(interaction, { musicPlayer, logger }) {
//     const query = interaction.options.getString("query", true);
//     const member = interaction.member;

//     if (!member || !("voice" in member) || !member.voice.channel) {
//       await interaction.reply({
//         content: "🚫 You must be in a voice channel.",
//         ephemeral: true,
//       });
//       return;
//     }

//     await interaction.deferReply();

//     try {
//       const response = await musicPlayer.play(interaction.guild, member, query);

//       // For display purposes, we assume the last added track is the one just added
//       const queue = musicPlayer.getQueue(interaction.guild.id);
//       const track = queue[queue.length - 1];

//       if (!track) {
//         await interaction.editReply({ content: response });
//         return;
//       }

//       const embed = new EmbedBuilder()
//         .setTitle("🎵 Added to Queue")
//         .setDescription(`[${track.title}](${track.url})`)
//         .setColor(0x1db954)
//         .setFooter({ text: "Queued via Spotify" });

//       if (track.image) {
//         embed.setThumbnail(track.image);
//       }

//       const sent = await interaction.editReply({
//         content: response,
//         embeds: [embed],
//       });

//       // Optional reactions
//       await sent.react("🎵"); // confirm
//     } catch (err) {
//       logger.error("❌ Error in /play command:", err);
//       await interaction.editReply({ content: "❌ Could not play track." });
//     }
//   },
// });
