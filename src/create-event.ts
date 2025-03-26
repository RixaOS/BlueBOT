import { type ClientEvents, type Awaitable } from "discord.js";
import type { Context } from "./index.ts";

type Event<T extends keyof ClientEvents> = {
  name: T;
  execute: (
    ...args: [...args: ClientEvents[T], context: Context]
  ) => Awaitable<void>;
};

export function createEvent<T extends keyof ClientEvents>(event: Event<T>) {
  return event;
}
