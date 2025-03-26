import type { ClientEvents } from "discord.js";
import type { Context } from "./index.ts";

// ✅ Limit to real event names
type EventName = keyof ClientEvents;

// ✅ Allow execution with context + proper event arguments
type EventWithContext<K extends EventName> = {
  name: K;
  execute: (...args: [...ClientEvents[K], Context]) => void | Promise<void>;
};

export function createEvent<K extends EventName>(event: EventWithContext<K>) {
  return event;
}
