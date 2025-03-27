export type QueueItem = {
  title: string;
  url: string;
  image: string | undefined; // ✅ Not just optional, but explicitly allows undefined
  metadata: {
    encoded: string; // The base64 Lavalink track string
  };
};

export class MusicQueue {
  private queues = new Map<string, QueueItem[]>();

  getQueue(guildId: string): QueueItem[] {
    return this.queues.get(guildId) || [];
  }

  addToQueue(guildId: string, item: QueueItem): void {
    const queue = this.getQueue(guildId);
    queue.push(item);
    this.queues.set(guildId, queue);
  }

  nextSong(guildId: string): QueueItem | undefined {
    const queue = this.getQueue(guildId);
    const next = queue.shift();
    this.queues.set(guildId, queue);
    return next;
  }

  clearQueue(guildId: string): void {
    this.queues.set(guildId, []);
  }

  isEmpty(guildId: string): boolean {
    return this.getQueue(guildId).length === 0;
  }

  getCurrent(guildId: string): QueueItem | undefined {
    return this.getQueue(guildId)[0];
  }
}
