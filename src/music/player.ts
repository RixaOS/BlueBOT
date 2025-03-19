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

export class MusicPlayer {
  private players = new Map<string, AudioPlayer>();
  private connections = new Map<string, VoiceConnection>();
  private queues = new MusicQueue();

  async play(guild: Guild, member: GuildMember, query: string) {
    if (!member.voice.channel) {
      return "❌ You need to be in a voice channel to play music.";
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
      const songInfo = await ytdl.getInfo(query);
      const song: QueueItem = {
        url: query,
        title: songInfo.videoDetails.title,
      };

      this.queues.addToQueue(guild.id, song);

      if (player.state.status !== AudioPlayerStatus.Playing) {
        this.startPlayback(guild.id);
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
      this.startPlayback(guildId); // Try next song
      return;
    }

    const resource = createAudioResource(stream);
    let player = this.players.get(guildId);
    if (!player) {
      player = createAudioPlayer();
      this.players.set(guildId, player);
      this.connections.get(guildId)?.subscribe(player);
    }

    player.play(resource);
    player.on(AudioPlayerStatus.Idle, () => this.startPlayback(guildId)); // Play next song
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

// ✅ Function to fetch the YouTube audio stream
async function getYouTubeStream(url: string) {
  try {
    const stream = ytdl(url, {
      filter: "audioonly",
      highWaterMark: 1 << 25, // Prevents buffering issues
      requestOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    });

    return stream;
  } catch (error) {
    console.error("❌ YouTube Fetch Error:", error);
    return;
  }
}
