import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import { openai } from "../../config.ts";

export const ask = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "ask",
  description: "Ask a question to ChatGPT!",
  options: [
    {
      name: "question",
      description: "What do you want to ask?",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction) {
    const question = interaction.options.getString("question", true);
    await interaction.deferReply();

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // of gpt-4 als je dat wilt
        messages: [
          {
            role: "user",
            content: `${question}. Strictly make sure the response stops when theres >= 1024 signs.`,
          },
        ],
      });

      const answer =
        completion.choices[0]?.message?.content ?? "No answer found.";

      const embed = new EmbedBuilder()
        .setTitle("🤖 ChatGPT Answers")
        .setDescription(question)
        .setColor(Colors.Blue)
        .addFields([{ name: "📝 Answer", value: answer }])
        .setFooter({ text: "OpenAI ChatGPT • GPT-4o" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ OpenAI Error:", err);
      if (err instanceof Error) {
        console.error("💥 Error message:", err.message);
        if ("response" in err) {
          console.error("📨 Response error:", (err as any).response?.data);
        }
      }
      await interaction.editReply(
        "❌ Something went wrong getting the answer.",
      );
    }
  },
});
