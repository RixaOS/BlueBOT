import {
  ApplicationCommandType,
  EmbedBuilder,
  Colors,
  Message,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import OpenAI from "openai";
import { config } from "../../config.ts";

const openai = new OpenAI({ apiKey: config.OPENAPI_KEY });

export const translate = createCommand({
  name: "Translate",
  type: ApplicationCommandType.Message,

  async execute(interaction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    try {
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply("✅ Command triggered successfully.");
    } catch (err) {
      console.error("❌ Error:", err);
    }

    const message = interaction.targetMessage as Message<true>;
    const originalText = message.content;

    if (!originalText || originalText.length === 0) {
      await interaction.reply({
        content: "❌ Can't translate empty messages",
        ephemeral: true,
      });
      return;
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a translation assistant. Detect the source language and translate the following text to English. Respond with only the translated text. Strictly make sure the response stops when theres >= 1024 signs.",
          },
          {
            role: "user",
            content: originalText,
          },
        ],
      });

      const translated =
        completion.choices[0]?.message?.content ?? "❌ No translation found.";

      const embed = new EmbedBuilder()
        .setTitle("🌍 Translation")
        .setColor(Colors.Green)
        .addFields([
          { name: "Original", value: originalText },
          { name: "Translated (English)", value: translated },
        ])
        .setFooter({ text: "Translated with OpenAI" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ OpenAI translation error:", err);
      await interaction.editReply("❌ Something went wrong translating.");
    }
  },
});
