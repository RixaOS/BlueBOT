import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const elementEmojis = {
  Fire: "🔥",
  Ice: "❄️",
  Lightning: "⚡",
  Wind: "🍃",
  Quantum: "🌀",
  Imaginary: "🌈",
  Physical: "💪",
};
const characterMapPath = path.join(
  process.cwd(),
  "src/data/hsr/characterMap.json",
);
const characterMap = JSON.parse(fs.readFileSync(characterMapPath, "utf-8"));

function parseRichText(raw: string): string {
  try {
    const json = JSON.parse(raw);
    return (
      json.content
        ?.map((p: any) => p.content?.map((n: any) => n.value).join("") ?? "")
        .join("\n\n")
        .trim() || "No description."
    );
  } catch {
    return "No description.";
  }
}

export const hsrCommand = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "hsr",
  description: "Get character info from Honkai: Star Rail",
  options: [
    {
      name: "character",
      description: "The character to look up",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],

  async execute(interaction, context) {
    const input = interaction.options
      .getString("character", true)
      .toLowerCase();
    const matchedKey = Object.keys(characterMap).find(
      (k) => k.toLowerCase() === input,
    );
    if (!matchedKey) {
      await interaction.reply({
        content: `🚫 Character not found.`,
        ephemeral: true,
      });
      return;
    }

    const char = characterMap[matchedKey];

    if (!char.details) {
      const slug = char.url.split("/").pop();
      try {
        interface PageData {
          result?: {
            data?: {
              currentUnit?: {
                nodes?: Array<{
                  name: string;
                  rarity?: string;
                  path?: string;
                  element?: string;
                  affiliation?: string;
                  description?: {
                    raw: string; // stringified JSON representing rich text
                  };
                  defaultRole?: string;
                }>;
              };
            };
          };
        }

        const res = await fetch(
          `https://www.prydwen.gg/page-data/star-rail/characters/${slug}/page-data.json`,
        );
        const json = (await res.json()) as PageData;
        const node = json.result?.data?.currentUnit?.nodes?.[0];

        if (!node) {
          context.logger.warn("⚠️ No character node found.");
          return;
        }

        // Extract details
        const details = {
          element: node.element ?? "Unknown",
          path: node.path ?? "Unknown",
          rarity: Number(node.rarity ?? "0"),
          role: node.defaultRole ?? "—",
          description: parseRichText(node.description?.raw ?? ""),
        };

        characterMap[matchedKey].details = details;
        fs.writeFileSync(
          characterMapPath,
          JSON.stringify(characterMap, null, 2),
          "utf-8",
        );
      } catch (err) {
        context.logger.warn(
          `⚠️ Failed to fetch details for ${matchedKey}: ${err}`,
        );
      }
    }

    const d = char.details;
    const emoji = elementEmojis[d.element as keyof typeof elementEmojis] || "";
    const embed = new EmbedBuilder()
      .setTitle(`${char.name}${d.subtitle ? ` – ${d.subtitle}` : ""}`)
      .setURL(char.url)
      .setThumbnail(char.image)
      .setDescription(d.description)
      .addFields(
        { name: "Element", value: `${emoji} ${d.element}`, inline: true },
        { name: "Path", value: d.path, inline: true },
        { name: "Rarity", value: "⭐".repeat(d.rarity), inline: true },
        { name: "Role", value: d.role, inline: true },
      )
      .setFooter({ text: "Sourced from Prydwen.gg" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Pros and Cons")
        .setCustomId(`hsr_procon_${matchedKey}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Relics")
        .setCustomId(`hsr_relics_${matchedKey}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Light Cones")
        .setCustomId(`hsr_cones_${matchedKey}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Teams")
        .setCustomId(`hsr_teams_${matchedKey}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Traces")
        .setCustomId(`hsr_traces_${matchedKey}`)
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    context.logger.info(`📊 /hsr used for: ${char.name}`);
  },
});
