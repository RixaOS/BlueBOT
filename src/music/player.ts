// import { Client, GatewayIntentBits, Guild, GuildMember } from 'discord.js';
// import { Shoukaku, Connectors, type NodeOption } from 'shoukaku';

// const LavalinkNodes: NodeOption[] = [
//   {
//     name: "main",
//     url: "localhost:2333",
//     auth: "youshallnotpass",
//     secure: false,
//   },
// ];

// const ShoukakuOptions = {
//     moveOnDisconnect: false,
//     resumable: false,
//     resumableTimeout: 30,
//     reconnectTries: 2,
//     restTimeout: 10000
// };

// export class MusicPlayer {
//     public shoukaku: Shoukaku;

//     constructor(client: Client) {
//         this.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), LavalinkNodes, ShoukakuOptions);
//         this.setupShoukakuEvents();
//     }

//     private setupShoukakuEvents(): void {
//         this.shoukaku.on('ready', name => console.log(`✅ Lavalink ${name} ready`));
//         this.shoukaku.on('error', (name, error) => console.error(`❌ Lavalink ${name} error:`, error));
//         this.shoukaku.on('close', (name, code, reason) => console.warn(`⚠️ Lavalink ${name} closed: ${code} - ${reason || 'No reason'}`));
//     }

//     async play(guild: Guild, member: GuildMember, query: string): Promise<{ title: string; }> {
//         if (!member.voice.channel) throw new Error("❌ You must be in a voice channel.");

//         const node = this.shoukaku.nodes.values().next().value);
//         if (!node || !node.connect) throw new Error("❌ Lavalink node not connected.");

//         const result = await node.rest.resolve(query);
//         if (!result || !('tracks' in result) || !result.tracks.length) {
//             throw new Error("❌ No tracks found for the query.");
//         }

//         const track = result.tracks[0];

//         const player = await node.joinVoiceChannel({
//             guildID: guild.id,
//             voiceChannelID: member.voice.channel.id,
//             deaf: true
//         });

//         player.on('error', error => {
//             console.error("❌ Player error:", error);
//             player.disconnect();
//         });

//         for (const event of ['end', 'closed', 'nodeDisconnect']) {
//             player.on(event, () => player.disconnect());
//         }

//         await player.playTrack({ track: track.encoded });

//         return {
//             title: track.info.title
//         };
//     }
// }
