import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  TextChannel,
} from "discord.js";
import { config } from "../../config.ts";
import { createCommand } from "../../create-command.ts";

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
    {
      name: "reply_to",
      description: "Optional message ID to reply to",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  async execute(interaction, context) {
    if (interaction.user.id !== config.OWNER_ID) {
      await interaction.reply({
        content: "🚫 You are not allowed to use this command.",
        ephemeral: true,
      });
      return;
    }

    const message = interaction.options.getString("message", true);
    const replyToId = interaction.options.getString("reply_to");
    const channel = interaction.channel;

    if (!channel?.isTextBased()) {
      await interaction.reply({
        content: "❌ This channel cannot receive messages.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({ content: "✅ Message sent!", ephemeral: true });

    // ✅ If replyToId is provided, attempt to fetch and reply
    if (replyToId) {
      try {
        const targetMsg = await (channel as TextChannel).messages.fetch(
          replyToId,
        );

        await channel.send({
          content: message,
          reply: {
            messageReference: targetMsg.id,
          },
          allowedMentions: { repliedUser: true },
        });

        context.logger.info(
          `📣 ${interaction.user.tag} used /say in reply to ${targetMsg.author.tag}`,
        );
        return;
      } catch (err) {
        context.logger.warn(
          `⚠️ Could not find message ID ${replyToId} — sending normally.`,
        );
        // Continue to send as a normal message below
      }
    }

    // Fallback: send as normal message
    await channel.send(message);
    context.logger.info(`📣 ${interaction.user.tag} used /say: ${message}`);
  },
});
