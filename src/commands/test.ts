import { ApplicationCommandType } from "discord.js";
import { createCommand } from "../create-command.ts";

export const testCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "test",
  description: "test",
  execute(interaction) {
    interaction.reply("Hi.");
  },
});
