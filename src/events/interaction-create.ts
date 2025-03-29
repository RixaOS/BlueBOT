import { ApplicationCommandType, Events, codeBlock } from "discord.js";
import { isSetupComplete } from "../utils/is-setup-complete.ts";
import { createEvent } from "../create-event.ts";
import * as commands from "../commands/mod.ts";

export const interactionCreateEvent = createEvent({
  name: Events.InteractionCreate,
  async execute(interaction, context) {
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isContextMenuCommand()
    ) {
      return;
    }

    if (!interaction.inCachedGuild()) {
      await interaction.reply("❌ This command can only be used in a server.");
      return;
    }

    const command = Object.values(commands).find(
      (command) => command.name === interaction.commandName,
    );

    if (!command) {
      throw new Error(`Command \`${interaction.commandName}\` was not found.`);
    }

    try {
      if (
        interaction.isChatInputCommand() &&
        command.type === ApplicationCommandType.ChatInput
      ) {
        // Block all commands unless setup is complete
        if (
          interaction.commandName !== "setup" &&
          !isSetupComplete(interaction.guildId)
        ) {
          await interaction.reply({
            content:
              "⚠️ This bot has not been configured yet. Please run `/setup general`.",
            ephemeral: true,
          });
          return;
        }

        await command.execute(interaction, context);
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        await interaction.editReply({
          content: `Error:\n${codeBlock(error.message)}`,
          components: [],
        });
      }
    }
  },
});
