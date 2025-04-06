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

export const factCheck = createCommand({
  type: ApplicationCommandType.Message,
  name: "Fact-check",

  async execute(interaction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const message = interaction.targetMessage as Message<true>;
    const content = message.content;

    if (!content || content.length === 0) {
      await interaction.reply({
        content: "❌ This message doesn't contain any text to fact-check.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a strict fact-checking assistant. 
              Evaluate the following message. Return a JSON object only with the following format:
              {
                "summary": "Short summary of the claim or content.",
                "verdict": "Likely true | Misleading | False | Unverifiable",
                "reason": "Why did you give this verdict?",
                "confidence": 1-10,
                "bias": "Left | Center | Right | Unknown"
              }
              Do not add anything outside the JSON. Be concise and neutral.`,
          },
          {
            role: "user",
            content,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      let result;

      try {
        result = raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn("⚠️ Failed to parse JSON from GPT:", raw);
        await interaction.editReply(
          "⚠️ GPT gave an invalid response. Try again.",
        );
        return;
      }

      const { summary, verdict, confidence, bias, reason } = result;

      const confidenceBar =
        "🟩".repeat(confidence) + "⬜".repeat(10 - confidence);

      const embed = new EmbedBuilder()
        .setTitle("🔎 Fact-check Result")
        .setDescription(summary)
        .addFields(
          { name: "📊 Verdict", value: verdict, inline: true },
          {
            name: "🧠 Confidence",
            value: `${confidence}/10\n${confidenceBar}`,
            inline: true,
          },
          { name: "🏛️ Bias", value: bias, inline: true },
          { name: "🧾 Reason", value: reason ?? "No reason provided." },
          { name: "📝 Message", value: content.slice(0, 1024) },
        )
        .setColor(
          verdict === "Likely true"
            ? Colors.Green
            : verdict === "Misleading"
              ? Colors.Yellow
              : verdict === "False"
                ? Colors.Red
                : Colors.Grey,
        )
        .setFooter({ text: "Fact-checked via OpenAI" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Fact-check error:", err);
      await interaction.editReply("❌ Failed to evaluate the message.");
    }
  },
});
