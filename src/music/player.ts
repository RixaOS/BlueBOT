import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import { Guild, GuildMember } from "discord.js";
import ytdl from "@distube/ytdl-core"; // ✅ Use maintained version
import type { QueueItem } from "./queue.ts"; // ✅ Import as type
import { MusicQueue } from "./queue.ts";
import ytSearch from "yt-search";
import fs from "fs";

export class MusicPlayer {
  private players = new Map<string, AudioPlayer>();
  private connections = new Map<string, VoiceConnection>();
  private queues = new MusicQueue();

  async play(guild: Guild, member: GuildMember, query: string) {
    if (!member.voice.channel) {
      return "❌ You need to be in a voice channel to play music.";
    }

    // ✅ Detect if the input is a URL or a search query
    let videoUrl = query;
    if (!query.startsWith("http")) {
      console.log("🔍 Searching YouTube for:", query);
      const video = await searchYouTube(query);
      if (!video) {
        return "❌ No results found for your search.";
      }
      videoUrl = video.url;
      console.log(`✅ Found: ${video.title} (${videoUrl})`);
    }

    const connection = joinVoiceChannel({
      channelId: member.voice.channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator as any,
    });

    this.connections.set(guild.id, connection);
    let player = this.players.get(guild.id);
    if (!player) {
      player = createAudioPlayer();
      this.players.set(guild.id, player);
      connection.subscribe(player);
    }

    try {
      const songInfo = await ytdl.getInfo(videoUrl);
      const song: QueueItem = {
        url: videoUrl,
        title: songInfo.videoDetails.title,
      };

      this.queues.addToQueue(guild.id, song);
      console.log(`🎵 Added to queue: ${song.title}`);

      if (
        !this.players.has(guild.id) ||
        this.players.get(guild.id)?.state.status !== AudioPlayerStatus.Playing
      ) {
        await this.startPlayback(guild.id);
      }

      return `🎵 Added to queue: **${song.title}**`;
    } catch (error) {
      console.error("❌ Error fetching YouTube info:", error);
      return "❌ Failed to retrieve YouTube video.";
    }
  }

  private async startPlayback(guildId: string) {
    const song = this.queues.nextSong(guildId);
    if (!song) {
      this.disconnect(guildId);
      return;
    }

    const stream = await getYouTubeStream(song.url);
    if (!stream) {
      console.error("❌ Failed to get YouTube stream.");
      await this.startPlayback(guildId); // Try next song
      return;
    }

    try {
      const resource = createAudioResource(stream);
      let player = this.players.get(guildId);

      if (!player) {
        player = createAudioPlayer();
        this.players.set(guildId, player);
        this.connections.get(guildId)?.subscribe(player);
      }

      player.play(resource);
      player.on(AudioPlayerStatus.Idle, async () => {
        console.log("⏭️ Song finished, playing next in queue...");
        await this.startPlayback(guildId); // ✅ Ensure async call
      });

      player.on("error", (error) => {
        console.error("❌ Playback error:", error);
        this.startPlayback(guildId); // ✅ Skip to next song if there's an error
      });
    } catch (error) {
      console.error("❌ Error during playback:", error);
      this.startPlayback(guildId); // ✅ Skip to the next song if playback fails
    }
  }

  getQueue(guildId: string): QueueItem[] {
    return this.queues.getQueue(guildId);
  }

  pause(guildId: string) {
    this.players.get(guildId)?.pause();
  }

  resume(guildId: string) {
    this.players.get(guildId)?.unpause();
  }

  togglePause(guildId: string): boolean {
    const player = this.players.get(guildId);
    if (!player) return false;

    if (player.state.status === AudioPlayerStatus.Playing) {
      player.pause();
      return true;
    } else {
      player.unpause();
      return false;
    }
  }

  skip(guildId: string): boolean {
    if (!this.players.has(guildId) || !this.queues.getQueue(guildId).length) {
      return false;
    }

    this.startPlayback(guildId);
    return true;
  }

  stop(guildId: string) {
    this.queues.clearQueue(guildId);
    this.disconnect(guildId);
  }

  private disconnect(guildId: string) {
    this.players.get(guildId)?.stop();
    this.connections.get(guildId)?.destroy();
    this.players.delete(guildId);
    this.connections.delete(guildId);
  }
}

// WARNING: Using old cookie format, please use the new one instead. (https://github.com/distubejs/ytdl-core#cookies-support)

const clientOptions = {
  pipelining: 5,
  maxRedirections: 0,
};

const cookiesRaw = fs.readFileSync("./cookies.json", "utf-8"); // ✅ Add encoding
const cookies = JSON.parse(cookiesRaw);
const agent = ytdl.createAgent(cookies, clientOptions);

// ✅ Use proxy if available
if (process.env["PROXY_URL"]) {
  console.log("🛠 Using Proxy:", process.env["PROXY_URL"]);
  // client.dispatcher = new ProxyAgent(process.env["PROXY_URL"]);
}

async function getYouTubeStream(url: string) {
  try {
    console.log("🔍 Fetching YouTube stream:", url);
    console.log("🧐 Debug: Final request headers:", agent);

    const videoInfo = await ytdl.getInfo(url, { agent });

    if (
      !videoInfo ||
      !videoInfo.videoDetails ||
      !videoInfo.videoDetails.title
    ) {
      throw new Error(
        "❌ Failed to fetch video info. The video may be private, deleted, or region-restricted.",
      );
    }

    console.log(
      "✅ Video info fetched successfully:",
      videoInfo.videoDetails.title,
    );

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25,
      agent,
      dlChunkSize: 0,
      liveBuffer: 20000,
    });

    console.log("✅ YouTube stream fetched successfully.");
    return stream;
  } catch (error) {
    console.error("❌ YouTube Fetch Error:", error);
    return null;
  }
}

async function searchYouTube(query: string) {
  try {
    console.log(`🔍 Searching YouTube for: "${query}"`);

    const result = await ytSearch(query);
    if (!result.videos.length) {
      console.log("❌ No search results found.");
      return null;
    }

    // ✅ Filter out live videos and age-restricted content
    const filteredVideos = result.videos.filter(
      (video) => video.seconds > 0, // Skip live streams and invalid videos
    );

    if (filteredVideos.length === 0) {
      console.log(
        "❌ No valid videos found (live streams, age-restricted, or unavailable).",
      );
      return null;
    }

    console.log(
      `✅ Found valid video: ${filteredVideos[0]!.title} (${filteredVideos[0]!.url})`,
    );
    return filteredVideos[0]; // ✅ Return the first valid video
  } catch (error) {
    console.error("❌ YouTube Search Error:", error);
    return null;
  }
}
