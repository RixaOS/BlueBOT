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
import { parseRichText, parseRichBullets } from "../../config.ts";

function htmlToDiscordMarkdown(input: string): string {
  return input
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<[^>]+>/g, ""); // strip all other tags just in case
}

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
          statsComments?: {
            raw: string;
          };
          defaultRole?: string;
          pros?: {
            raw: string;
          };
          cons?: {
            raw: string;
          };
          eidolon?: {
            0: {
              upgrade1Name: string;
              upgrade1Desc?: {
                raw: string;
              };
              upgrade2Name: string;
              upgrade2Desc?: {
                raw: string;
              };
              upgrade3Name: string;
              upgrade3Desc?: {
                raw: string;
              };
              upgrade4Name: string;
              upgrade4Desc?: {
                raw: string;
              };
              upgrade5Name: string;
              upgrade5Desc?: {
                raw: string;
              };
              upgrade6Name: string;
              upgrade6Desc?: {
                raw: string;
              };
            };
          };
          traces?: {
            0: { name: string; desc: string; req: string };
            1: { name: string; desc: string; req: string };
            2: { name: string; desc: string; req: string };
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
  const d = char.details;

  if (id.startsWith("hsr_overview_")) {
    const embed = new EmbedBuilder()
      .setTitle(`${char.name} – Overview`)
      .setThumbnail(char.image)
      .setDescription(d.overview)
      .setFooter({ text: "Sourced from Prydwen.gg" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Back")
        .setCustomId(`hsr_basic_${key}`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setLabel("Overview")
        .setCustomId(`hsr_overview_${key}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel("Pros & Cons")
        .setCustomId(`hsr_procon_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Eidolons")
        .setCustomId(`hsr_eidolon_${key}`)
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

  if (id.startsWith("hsr_procon_")) {
    // Fetch and store pros/cons if missing
    if (!char.pros && !char.cons) {
      try {
        if (data) {
          char.pros = parseRichBullets(data.pros?.raw ?? "") || null;
          char.cons = parseRichBullets(data.cons?.raw ?? "") || null;

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
        .setLabel("Overview")
        .setCustomId(`hsr_overview_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Pros & Cons")
        .setCustomId(`hsr_procon_${key}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel("Eidolons")
        .setCustomId(`hsr_eidolon_${key}`)
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

  if (id.startsWith("hsr_eidolon_")) {
    try {
      if (
        !char.eidolons ||
        !Array.isArray(char.eidolons) ||
        char.eidolons.length === 0
      ) {
        const eidolonData = data?.eidolon?.[0];
        const eidolons: { name: string; desc: string }[] = [];

        if (eidolonData) {
          for (let i = 1; i <= 6; i++) {
            const nameKey = `upgrade${i}Name` as keyof typeof eidolonData;
            const descKey = `upgrade${i}Desc` as keyof typeof eidolonData;

            const name = eidolonData[nameKey];
            const descValue = eidolonData[descKey];
            const descRaw =
              typeof descValue === "string"
                ? descValue
                : typeof descValue === "object" &&
                    typeof descValue.raw === "string"
                  ? descValue.raw
                  : null;

            const desc = descRaw ? parseRichText(descRaw) : null;

            if (typeof name === "string" && typeof desc === "string") {
              eidolons.push({ name, desc });
            }
          }
        }

        if (eidolons.length > 0) {
          char.eidolons = eidolons;
          characterMap[key] = char;
          fs.writeFileSync(
            characterMapPath,
            JSON.stringify(characterMap, null, 2),
            "utf-8",
          );
        }
      }

      if (!char.eidolons || char.eidolons.length === 0) {
        await interaction.update({
          content:
            "❌ Eidolon data could not be loaded for this character. Please try again later.",
          embeds: [],
          components: [],
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${char.name} – Eidolons`)
        .setThumbnail(char.image)
        .addFields(
          char.eidolons.map((e: { name: any; desc: any }, i: number) => ({
            name: `E${i + 1}: ${e.name}`,
            value: e.desc,
            inline: false,
          })),
        )
        .setFooter({ text: "Sourced from Prydwen.gg" });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Back")
          .setCustomId(`hsr_basic_${key}`)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setLabel("Overview")
          .setCustomId(`hsr_overview_${key}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel("Pros & Cons")
          .setCustomId(`hsr_procon_${key}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel("Eidolons")
          .setCustomId(`hsr_eidolon_${key}`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setLabel("Traces")
          .setCustomId(`hsr_traces_${key}`)
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.update({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.error(`❌ Failed to load eidolons for ${key}:`, err);
      await interaction.update({
        content: "⚠️ An unexpected error occurred while loading Eidolon data.",
        embeds: [],
        components: [],
      });
    }

    return;
  }

  if (id.startsWith("hsr_traces_")) {
    try {
      // Ensure char.traces is generated only once
      if (!char.traces || !Array.isArray(char.traces)) {
        const traceData = data?.traces as Record<
          number,
          { name: string; desc: string; req: string }
        >;
        const traces: { name: string; desc: string; req: string }[] = [];

        if (traceData) {
          for (let i = 0; i <= 2; i++) {
            const trace = traceData[i];
            if (trace?.name && trace?.desc && trace?.req) {
              traces.push({
                name: trace.name,
                desc: htmlToDiscordMarkdown(trace.desc),
                req: htmlToDiscordMarkdown(trace.req),
              });
            }
          }
        }

        if (traces.length > 0) {
          char.traces = traces;
          characterMap[key] = char;
          fs.writeFileSync(
            characterMapPath,
            JSON.stringify(characterMap, null, 2),
            "utf-8",
          );
        }
      }

      // If still missing, show fallback
      if (!char.traces || char.traces.length === 0) {
        await interaction.update({
          content: "❌ Trace data could not be loaded for this character.",
          embeds: [],
          components: [],
        });
        return;
      }

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle(`${char.name} – Traces`)
        .setThumbnail(char.image)
        .addFields(
          char.traces.map(
            (t: { name: any; req: any; desc: any }, i: number) => ({
              name: `${i + 1}. ${t.name}`,
              value: `**Requirement:** ${t.req}\n${t.desc}`,
              inline: false,
            }),
          ),
        )
        .setFooter({ text: "Sourced from Prydwen.gg" });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Back")
          .setCustomId(`hsr_basic_${key}`)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setLabel("Overview")
          .setCustomId(`hsr_overview_${key}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel("Pros & Cons")
          .setCustomId(`hsr_procon_${key}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel("Eidolons")
          .setCustomId(`hsr_eidolon_${key}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel("Traces")
          .setCustomId(`hsr_traces_${key}`)
          .setStyle(ButtonStyle.Primary),
      );

      await interaction.update({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.error(`❌ Failed to load traces for ${key}:`, err);
      await interaction.update({
        content: "⚠️ An error occurred while loading Traces.",
        embeds: [],
        components: [],
      });
    }

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
        .setLabel("Overview")
        .setCustomId(`hsr_overview_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Relics")
        .setCustomId(`hsr_relics_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Planars")
        .setCustomId(`hsr_planars_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Light Cones")
        .setCustomId(`hsr_cones_${key}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel("Teams")
        .setCustomId(`hsr_teams_${key}`)
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
