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

import {
  ApplicationCommandType,
  CommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  VoiceChannel,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import puppeteer, { Browser, Page } from "puppeteer";
import { config } from "../../config.ts";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayer,
} from "@discordjs/voice";
import ffmpegPath from "ffmpeg-static";

// Declare global variables for Puppeteer and FFmpeg
let browser: Browser | null = null;
let page: Page | null = null;
let ffmpegProcess: ChildProcessWithoutNullStreams | null = null;
let audioPlayer: AudioPlayer | null = null;

// Command Definition
export const play = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "play",
  description: "Play music directly from Spotify in your voice channel.",
  dm_permission: false,
  options: [
    {
      type: 3, // String option
      name: "url",
      description: "Spotify track, album, or playlist URL",
      required: true,
    },
  ],

  async execute(interaction: CommandInteraction) {
    if (!config.SPOTIFY_EMAIL || !config.SPOTIFY_PASSWORD) {
      await interaction.reply(
        "Spotify email or password has not been configured",
      );
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel as VoiceChannel;

    if (!voiceChannel) {
      await interaction.reply({
        content: "You must be in a voice channel to use this command.",
        ephemeral: true,
      });
      return;
    }

    const url = interaction.options.get("url")?.value as string;

    await interaction.deferReply();
    try {
      // Launching Puppeteer (Headless Browser)
      browser = await puppeteer.launch({
        headless: false,
        executablePath: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
        ignoreDefaultArgs: true,
        args: [
          "-new-instance",
          "https://accounts.spotify.com/nl/login?continue=https%3A%2F%2Fopen.spotify.com%2F",
        ],
        defaultViewport: { width: 1280, height: 800 },
      });

      page = await browser.newPage();

      // Anti-Detection Settings
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
      );
      await page.evaluateOnNewDocument(() => {
        // @ts-ignore - Anti-Detection in Browser Context
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        // @ts-ignore - Anti-Detection in Browser Context
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        // @ts-ignore - Anti-Detection in Browser Context
        Object.defineProperty(navigator, "languages", {
          get: () => ["nl-NL", "nl"],
        });
        // @ts-ignore - Anti-Detection in Browser Context
        Object.defineProperty(navigator, "platform", { get: () => "Win64" });
        // @ts-ignore - Anti-Detection in Browser Context
        window.chrome = { runtime: {} };
      });

      // Debugging Screenshot (Before Login)
      await page.screenshot({ path: "spotify-login-debug-start.png" });
      console.log("Debug screenshot saved: spotify-login-debug-start.png");

      // Improved login selector with retries
      await page.waitForSelector('input[id="login-username"]', {
        visible: true,
        timeout: 30000, // 60 seconds timeout (increase if needed)
      });
      await page.type('input[id="login-username"]', config.SPOTIFY_EMAIL, {
        delay: 100,
      }); // Slow typing for anti-detection
      await page.click('button[id="login-button"]');
      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );
      await page.screenshot({ path: "spotify-login-debug.png" });
      console.log("Debug screenshot saved as spotify-login-debug.png");
      await page.click('button[type="button"]');
      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );
      await page.type('input[id="login-password"]', config.SPOTIFY_PASSWORD, {
        delay: 100,
      });
      await page.click('button[id="login-button"]');

      // Wait for the login process to complete
      await page.waitForNavigation({
        waitUntil: "networkidle2", // Wait until the page is fully loaded
        timeout: 60000, // 60 seconds timeout (increase if needed)
      });

      // Open Spotify URL and play
      await page.goto(url);
      await page.waitForSelector(".control-button--circled");
      await page.click(".control-button--circled"); // Play button

      // Connect to the voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Start capturing audio with FFmpeg
      ffmpegProcess = spawn(ffmpegPath as unknown as string, [
        "-f",
        "pulse", // Change to "dshow" for Windows, "avfoundation" for Mac
        "-i",
        "default", // Default audio device (change if needed)
        "-ac",
        "2",
        "-ar",
        "48000",
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "pipe:1",
      ]);

      audioPlayer = createAudioPlayer();
      const resource = createAudioResource(ffmpegProcess.stdout);
      audioPlayer.play(resource);
      connection.subscribe(audioPlayer);

      await interaction.editReply(`🎶 Now playing: ${url}`);
    } catch (error) {
      console.error("Spotify Playback Error:", error);
      await interaction.editReply(
        "⚠️ Failed to play Spotify music. Please try again.",
      );
      return;
    }

    await interaction.reply("Something went wrong");
  },
});

// Cleanup on bot shutdown
process.on("exit", () => {
  if (browser) browser.close();
  if (ffmpegProcess) ffmpegProcess.kill();
});
