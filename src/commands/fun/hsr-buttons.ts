import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseRichText } from "../../config.ts";

const characterMapPath = path.join(
  process.cwd(),
  "src/data/hsr/characterMap.json",
);
const characterMap = JSON.parse(fs.readFileSync(characterMapPath, "utf-8"));
const elementEmojis = {
  Fire: "🔥",
  Ice: "❄️",
  Lightning: "⚡",
  Wind: "🍃",
  Quantum: "🌀",
  Imaginary: "🌈",
  Physical: "💪",
};

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
          pros?: {
            raw: string;
          };
          cons?: {
            raw: string;
          };
        }>;
      };
    };
  };
}

export async function handleHsrButton(interaction: ButtonInteraction) {
  const id = interaction.customId ?? "";
  const key = id.split("_").slice(2).join("_");
  const char = characterMap[key];

  if (!char) {
    await interaction.reply({
      content: key,
      ephemeral: true,
    });
    return;
  }

  const slug = char.url.split("/").filter(Boolean).pop();
  const res = await fetch(
    `https://www.prydwen.gg/page-data/star-rail/characters/${slug}/page-data.json`,
  );
  const json = (await res.json()) as PageData;
  const data = json.result?.data?.currentUnit?.nodes?.[0]!;

  if (id.startsWith("hsr_procon_")) {
    // Fetch and store pros/cons if missing
    if (!char.pros && !char.cons) {
      try {
        if (data) {
          const parsedPros = parseRichText(data.pros?.raw ?? "");
          const parsedCons = parseRichText(data.cons?.raw ?? "");

          char.pros = parsedPros || null;
          char.cons = parsedCons || null;

          characterMap[key] = char;
          fs.writeFileSync(
            characterMapPath,
            JSON.stringify(characterMap, null, 2),
            "utf-8",
          );
        }
      } catch (err) {
        console.warn(`⚠️ Failed to fetch pros/cons for ${key}:`, err);
      }
    }

    if (!char.pros && !char.cons) {
      await interaction.reply({
        content: "No pros and cons found",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${char.name} – Pros & Cons`)
      .setThumbnail(char.image)
      .addFields(
        [
          char.pros ? { name: "✅ Pros", value: char.pros } : null,
          char.cons ? { name: "⚠️ Cons", value: char.cons } : null,
        ].filter(Boolean) as { name: string; value: string }[],
      )
      .setFooter({ text: "Sourced from Prydwen.gg" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Back")
        .setCustomId(`hsr_basic_${key}`)
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.update({
      embeds: [embed], // the new embed to "tab" to
      components: [row], // the original row of buttons
    });
    return;
  }

  //   HSR Basic info
  if (id.startsWith("hsr_basic_")) {
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
        .setCustomId(`hsr_procon_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Relics")
        .setCustomId(`hsr_relics_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Light Cones")
        .setCustomId(`hsr_cones_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Teams")
        .setCustomId(`hsr_teams_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Traces")
        .setCustomId(`hsr_traces_${key}`)
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({
      embeds: [embed], // the new embed to "tab" to
      components: [row], // the original row of buttons
    });
    return;
  }

  //   HSR RELICS
  if (id.startsWith("hsr_relics_")) {
    // Fetch and store pros/cons if missing
    if (!char.pros && !char.cons) {
      try {
        if (data) {
          const parsedPros = parseRichText(data.pros?.raw ?? "");
          const parsedCons = parseRichText(data.cons?.raw ?? "");

          char.pros = parsedPros || null;
          char.cons = parsedCons || null;

          characterMap[key] = char;
          fs.writeFileSync(
            characterMapPath,
            JSON.stringify(characterMap, null, 2),
            "utf-8",
          );
        }
      } catch (err) {
        console.warn(`⚠️ Failed to fetch pros/cons for ${key}:`, err);
      }
    }

    if (!char.pros && !char.cons) {
      await interaction.reply({
        content: "No pros and cons found",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${char.name} – Pros & Cons`)
      .setThumbnail(char.image)
      .addFields(
        [
          char.pros ? { name: "✅ Pros", value: char.pros } : null,
          char.cons ? { name: "⚠️ Cons", value: char.cons } : null,
        ].filter(Boolean) as { name: string; value: string }[],
      )
      .setFooter({ text: "Sourced from Prydwen.gg" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Back")
        .setCustomId(`hsr_basic_${key}`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setLabel("Relics")
        .setCustomId(`hsr_relics_${key}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel("Planar")
        .setCustomId(`hsr_planar_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Stats")
        .setCustomId(`hsr_stats_${key}`)
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({
      embeds: [embed], // the new embed to "tab" to
      components: [row], // the original row of buttons
    });
    return;
  }

  // Future buttons: relics, cones, etc.
}
