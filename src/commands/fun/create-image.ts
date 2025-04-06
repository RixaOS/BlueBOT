import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import { openai } from "../../config.ts";

// In-memory cooldown map (userId → timestamp)
const cooldowns = new Map<string, number>();

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export const generateImage = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "generate-image",
  description: "🖼️ Generate an AI image using OpenAI (1× per hour per user)",
  options: [
    {
      name: "prompt",
      description: "Describe the image you want to generate",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction) {
    const prompt = interaction.options.getString("prompt", true);
    const userId = interaction.user.id;

    const lastUsed = cooldowns.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 60000);
      await interaction.reply({
        content: `⏳ You can use this command again in ${remaining} minute(s).`,
        ephemeral: true,
      });
      return;
    }

    cooldowns.set(userId, now);
    await interaction.deferReply();

    try {
      const response = await openai.images.generate({
        prompt,
        model: "dall-e-3",
        size: "1024x1024",
        n: 1,
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        await interaction.editReply("❌ Failed to generate image.");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🖼️ AI Image Generated")
        .setDescription(`**Prompt:** ${prompt}`)
        .setImage(imageUrl)
        .setColor(Colors.Blue)
        .setFooter({ text: "Generated with OpenAI DALL·E 3" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Image generation failed:", err);
      await interaction.editReply(
        "❌ Something went wrong while generating the image.",
      );
    }
  },
});
