export interface QueueItem {
  url: string;
  title: string;
}

export class MusicQueue {
  private queues: Map<string, QueueItem[]> = new Map();

  addToQueue(guildId: string, song: QueueItem) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
    }
    this.queues.get(guildId)!.push(song);
  }

  getQueue(guildId: string): QueueItem[] {
    return this.queues.get(guildId) || [];
  }

  nextSong(guildId: string): QueueItem | null {
    const queue = this.queues.get(guildId);
    if (!queue || queue.length === 0) return null;
    return queue.shift() || null;
  }

  clearQueue(guildId: string) {
    this.queues.delete(guildId);
  }
}
