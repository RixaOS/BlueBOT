import type {
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
  UserContextMenuCommandInteraction,
  ApplicationCommandType,
} from "discord.js";
import type { Context } from "./index.ts";

type ApplicationCommandTypeInteraction = {
  [ApplicationCommandType.ChatInput]: ChatInputCommandInteraction<"cached">;
  [ApplicationCommandType.User]: UserContextMenuCommandInteraction<"cached">;
  [ApplicationCommandType.Message]: MessageContextMenuCommandInteraction<"cached">;
};

type Command<T extends ApplicationCommandType> =
  RESTPostAPIApplicationCommandsJSONBody & {
    type: T;
    execute: (
      interaction: T extends keyof ApplicationCommandTypeInteraction
        ? ApplicationCommandTypeInteraction[T]
        : never,
      context: Context,
    ) => void | Promise<void>;
  };

export function createCommand<T extends ApplicationCommandType>(
  command: Command<T>,
) {
  return command;
}
