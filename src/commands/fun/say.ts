import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord.js";
import { config } from "../../config.ts";
import { createCommand } from "../../create-command.ts";

const OWNER_ID = config.OWNER_ID; // 👈 Replace with your real Discord ID

export const say = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "say",
  description: "Make the bot send a message in this channel.",
  options: [
    {
      name: "message",
      description: "The message you want the bot to say",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction, context) {
    if (interaction.user.id !== OWNER_ID) {
      await interaction.reply({
        content: "🚫 You are not allowed to use this command.",
        ephemeral: true,
      });
      context.logger.warn(
        `❌ Unauthorized /say attempt by ${interaction.user.tag}`,
      );
      return;
    }

    const message = interaction.options.getString("message", true);

    await interaction.reply({ content: "✅ Message sent!", ephemeral: true });

    await interaction.channel?.send(message);
    context.logger.info(`📣 ${interaction.user.tag} used /say: ${message}`);
  },
});
