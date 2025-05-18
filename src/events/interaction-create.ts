import { ApplicationCommandType, Events, codeBlock } from "discord.js";
import { isSetupComplete } from "../utils/is-setup-complete.ts";
import { createEvent } from "../create-event.ts";
import * as commands from "../commands/mod.ts";
import { handleHsrButton } from "../commands/fun/hsr-buttons.ts";
import characterMap from "../data/hsr/characterMap.json" with { type: "json" };

export const interactionCreateEvent = createEvent({
  name: Events.InteractionCreate,
  async execute(interaction, context) {
    if (interaction.isButton() && interaction.customId.startsWith("hsr_")) {
      await handleHsrButton(interaction);
      return;
    }

    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused(true);

      if (
        interaction.commandName === "hsr" &&
        focused.name === "character" &&
        typeof focused.value === "string"
      ) {
        const query = focused.value.toLowerCase();

        const results = Object.entries(characterMap)
          .filter(([_, value]) => {
            if (!("name" in value) || typeof value.name !== "string")
              return false;
            return value.name.toLowerCase().includes(query);
          })
          .slice(0, 25)
          .map(([key, value]) => ({
            name: (value as any).name, // force-cast for now unless you have proper types
            value: key,
          }));

        await interaction.respond(results);
        return;
      }

      await interaction.respond([]);
      return;
    }

    // ✅ Ignore non-command interactions
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isContextMenuCommand()
    ) {
      return;
    }

    // ✅ Only handle cached guilds
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
      // ✅ Handle slash commands
      if (
        interaction.isChatInputCommand() &&
        command.type === ApplicationCommandType.ChatInput
      ) {
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

      // ✅ Handle message context menu
      if (
        interaction.isMessageContextMenuCommand() &&
        command.type === ApplicationCommandType.Message
      ) {
        await command.execute(interaction, context);
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
              content: `Error:\n${codeBlock(error.message)}`,
              components: [],
            });
          } else {
            await interaction.reply({
              content: `Error:\n${codeBlock(error.message)}`,
              ephemeral: true,
            });
          }
        } catch (err) {
          console.error("❌ Failed to respond with error:", err);
        }
      }
    }
  },
});
