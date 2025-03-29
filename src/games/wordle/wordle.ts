import {
  SlashCommandBuilder,
  ApplicationCommandType,
  TextChannel,
  NewsChannel,
  ThreadChannel,
} from "discord.js";
import { createCommand } from "../../create-command.ts";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { getServerConfig } from "../../config.ts";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GAME_FOLDER = path.join(__dirname, "..", "..", "data", "wordle");

const wordsFile = path.join(GAME_FOLDER, "words.json");
const wordOfTheDayFile = path.join(GAME_FOLDER, "word-of-the-day.json");

function loadJSON(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJSON(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function revealLetters(word: string, revealed: string[], letter: string) {
  return word.split("").map((c, i) => (c === letter ? letter : revealed[i]));
}

function formatDisplay(revealed: string[]) {
  return revealed.map((c) => (c === "_" ? "\\_" : `**${c}**`)).join(" ");
}

function getTopScorer(leaderboard: any) {
  return Object.entries(leaderboard).sort(
    (a: any, b: any) => b[1] - a[1],
  )[0]?.[0];
}

export default createCommand({
  ...new SlashCommandBuilder()
    .setName("wordle")
    .setDescription("Play the daily Wordle game!")
    .addSubcommand((cmd) =>
      cmd
        .setName("start")
        .setDescription("Start a new Wordle round (if none is active)"),
    )
    .addSubcommand((cmd) =>
      cmd
        .setName("guessletter")
        .setDescription("Guess a letter")
        .addStringOption((opt) =>
          opt
            .setName("letter")
            .setDescription("One letter (a-z)")
            .setRequired(true),
        ),
    )
    .addSubcommand((cmd) =>
      cmd
        .setName("guessword")
        .setDescription("Guess the entire word")
        .addStringOption((opt) =>
          opt
            .setName("word")
            .setDescription("Your full word guess")
            .setRequired(true),
        ),
    )
    .addSubcommand((cmd) =>
      cmd
        .setName("leaderboard")
        .setDescription("View top Wordle scorers for this server"),
    )
    .toJSON(),

  type: ApplicationCommandType.ChatInput,

  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const currentFile = path.join(GAME_FOLDER, `current_${guildId}.json`);
    const leaderboardFile = path.join(
      GAME_FOLDER,
      `leaderboard_${guildId}.json`,
    );

    const channelId = getServerConfig(interaction.guildId, "gameChannelId");
    if (!channelId) {
      await interaction.reply({
        content:
          "⚠️ This server hasn't been fully configured yet. Please run `/setup`.",
        ephemeral: true,
      });
      return;
    }

    const championRoleId = getServerConfig(
      interaction.guildId,
      "wordleRoleId",
    )!;

    if (sub === "leaderboard") {
      const leaderboard = fs.existsSync(leaderboardFile)
        ? loadJSON(leaderboardFile)
        : {};
      const entries = Object.entries(leaderboard)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, score]: any, i) => `${i + 1}. <@${id}> — ${score} point(s)`);

      await interaction.reply({
        embeds: [
          {
            title: "🏆 Wordle Leaderboard",
            description: entries.length ? entries.join("\n") : "No scores yet!",
            color: 0xe67e22,
          },
        ],
      });
      return;
    }

    if (fs.existsSync(currentFile)) {
      const existing = JSON.parse(fs.readFileSync(currentFile, "utf8"));
      const startedAt = new Date(existing.startTime || "")
        .toISOString()
        .split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      if (startedAt === today && existing.completed) {
        await interaction.reply({
          embeds: [
            {
              title:
                "🟨 A Wordle has already been started today. Try again tomorrow!",
              color: 0xe67e22,
            },
          ],
        });
        return;
      }
    }

    if (sub === "start") {
      function getTodayDateString(): string {
        return new Date().toISOString().split("T")[0] ?? "";
      }

      function getSharedWord(): string {
        const today = getTodayDateString();

        if (fs.existsSync(wordOfTheDayFile)) {
          const data = loadJSON(wordOfTheDayFile);
          if (data.date === today && typeof data.word === "string") {
            return data.word;
          }
        }

        const words: string[] = loadJSON(wordsFile);
        if (!Array.isArray(words) || words.length === 0) {
          throw new Error("No words left in the pool.");
        }

        const word =
          words[Math.floor(Math.random() * words.length)]!.toLowerCase();
        const updatedWords = words.filter((w) => w !== word);
        saveJSON(wordsFile, updatedWords);

        saveJSON(wordOfTheDayFile, {
          word,
          date: today,
        });

        return word;
      }

      // Make sure the game channel exists and is text-based
      const channel = await interaction.client.channels.fetch(channelId);
      const isValidChannel =
        channel &&
        (channel instanceof TextChannel ||
          channel instanceof NewsChannel ||
          channel instanceof ThreadChannel);

      // let overwriteCurrent = false;

      if (fs.existsSync(currentFile)) {
        const current = loadJSON(currentFile);
        const startedAt = new Date(current.startTime || "")
          .toISOString()
          .split("T")[0];
        const today = getTodayDateString();

        if (startedAt === today) {
          if (isValidChannel) {
            await channel.send({
              embeds: [
                {
                  title: "📌 Wordle Already Active",
                  description: `The current word is still in play.\n\n${formatDisplay(current.revealed)}`,
                  color: 0xe67e22,
                },
              ],
            });
          }
          await interaction.reply({
            content: "A Wordle is already active for this server.",
            ephemeral: true,
          });
          return;
        } else {
          // overwriteCurrent = true; // different day, start new word
        }
      }

      let word: string;
      try {
        word = getSharedWord();
      } catch (err: any) {
        await interaction.reply({
          content: "⚠️ Failed to start: " + err.message,
          ephemeral: true,
        });
        return;
      }

      const current = {
        word,
        revealed: Array(word.length).fill("_"),
        guessedLetters: [],
        startTime: new Date().toISOString(),
        lastGuesses: {},
      };

      saveJSON(currentFile, current);

      if (isValidChannel) {
        await channel.send({
          embeds: [
            {
              title: "🟨 New Wordle Started!",
              description: `The word has **${word.length} letters**.\nUse \`/wordle guessletter\` or \`/wordle guessword\` to play!\n\n${formatDisplay(current.revealed)}`,
              color: 0xf1c40f,
            },
          ],
        });
      }

      await interaction.reply({
        content: "✅ New Wordle started for this server.",
        ephemeral: true,
      });
      return;
    }

    if (!fs.existsSync(currentFile)) {
      await interaction.reply({
        content: "No active word right now. Use `/wordle start` to begin.",
        ephemeral: true,
      });
      return;
    }

    const current = loadJSON(currentFile);

    if (sub === "guessletter") {
      const letter = interaction.options
        .getString("letter", true)
        .toLowerCase();
      if (!/^[a-z]$/.test(letter)) {
        await interaction.reply({
          content: "Please enter a single letter (a-z).",
          ephemeral: true,
        });
        return;
      }

      const now = new Date();
      const last = new Date(current.lastGuesses?.[userId] || 0);
      if (now.getTime() - last.getTime() < 3600000) {
        await interaction.reply({
          content: "You can only guess one letter per hour.",
          ephemeral: true,
        });
        return;
      }

      if (current.guessedLetters.includes(letter)) {
        await interaction.reply({
          content: "That letter has already been guessed.",
          ephemeral: true,
        });
        return;
      }

      current.guessedLetters.push(letter);
      current.lastGuesses[userId] = now.toISOString();
      current.revealed = revealLetters(current.word, current.revealed, letter);
      saveJSON(currentFile, current);

      const channel = await interaction.client.channels.fetch(channelId);
      const wasCorrect = current.word.includes(letter);
      if (
        channel &&
        (channel instanceof TextChannel ||
          channel instanceof NewsChannel ||
          channel instanceof ThreadChannel)
      ) {
        await channel.send({
          embeds: [
            {
              title: wasCorrect ? "✅ Correct Letter!" : "❌ Incorrect Letter",
              description: `${interaction.user.username} guessed **${letter}**.\n\n${formatDisplay(current.revealed)}`,
              color: wasCorrect ? 0x2ecc71 : 0xe74c3c,
            },
          ],
        });
      }

      if (!current.revealed.includes("_")) {
        const leaderboard = fs.existsSync(leaderboardFile)
          ? loadJSON(leaderboardFile)
          : {};
        leaderboard[userId] = (leaderboard[userId] || 0) + 1;
        saveJSON(leaderboardFile, leaderboard);

        const topUserId = getTopScorer(leaderboard);
        const guild = interaction.guild;
        if (guild && topUserId) {
          for (const [, member] of await guild.members.fetch()) {
            if (
              member.roles.cache.has(championRoleId) &&
              member.id !== topUserId
            ) {
              await member.roles.remove(championRoleId);
            }
          }
          await guild.members.cache.get(topUserId)?.roles.add(championRoleId);
        }

        if (
          channel &&
          (channel instanceof TextChannel ||
            channel instanceof NewsChannel ||
            channel instanceof ThreadChannel)
        ) {
          await channel.send({
            embeds: [
              {
                title: "🎉 Word Completed!",
                description: `${interaction.user.username} completed the word: **${current.word}**! +1 point!`,
                color: 0x9b59b6,
              },
            ],
          });

          // ✅ Always respond to the user!
          await interaction.reply({
            content: "🎉 You completed the word and earned a point!",
            ephemeral: true,
          });

          leaderboard[userId] = (leaderboard[userId] || 0) + 1;
          saveJSON(leaderboardFile, leaderboard);

          if (guild && topUserId) {
            for (const [, member] of await guild.members.fetch()) {
              // Remove role from others
              if (
                member.roles.cache.has(championRoleId) &&
                member.id !== topUserId
              ) {
                await member.roles.remove(championRoleId);
              }
            }

            // Add role to top user
            const topMember = guild.members.cache.get(topUserId);
            if (topMember && !topMember.roles.cache.has(championRoleId)) {
              await topMember.roles.add(championRoleId);
            }
          }

          if (fs.existsSync(currentFile)) {
            current.completed = true;
            saveJSON(currentFile, current);
          }
          return;
        }
      }
      await interaction.reply({
        content: "✅ Letter guessed!",
        ephemeral: true,
      });
      return;
    }

    if (sub === "guessword") {
      const guess = interaction.options.getString("word", true).toLowerCase();
      let channel;
      try {
        channel = await interaction.client.channels.fetch(channelId);
      } catch (err) {
        console.error("Failed to fetch channel:", err);
      }

      const isCorrect = guess === current.word;

      if (isCorrect) {
        const leaderboard = fs.existsSync(leaderboardFile)
          ? loadJSON(leaderboardFile)
          : {};
        leaderboard[userId] = (leaderboard[userId] || 0) + 1;
        saveJSON(leaderboardFile, leaderboard);

        const topUserId = getTopScorer(leaderboard);
        const guild = interaction.guild;

        if (guild && topUserId) {
          const member = guild.members.cache.get(topUserId);
          if (member) {
            await member.roles.add(championRoleId);
          }
        }

        if (
          channel &&
          (channel instanceof TextChannel ||
            channel instanceof NewsChannel ||
            channel instanceof ThreadChannel)
        ) {
          await channel.send({
            embeds: [
              {
                title: "🎯 Word Guessed!",
                description: `${interaction.user.username} guessed the word: **${current.word}**! +1 point!`,
                color: 0x3498db,
              },
            ],
          });
        }

        await interaction.reply({
          content: "✅ Correct word! +1 point.",
          ephemeral: true,
        });

        leaderboard[userId] = (leaderboard[userId] || 0) + 1;
        saveJSON(leaderboardFile, leaderboard);

        if (guild && topUserId) {
          for (const [, member] of await guild.members.fetch()) {
            // Remove role from others
            if (
              member.roles.cache.has(championRoleId) &&
              member.id !== topUserId
            ) {
              await member.roles.remove(championRoleId);
            }
          }

          // Add role to top user
          const topMember = guild.members.cache.get(topUserId);
          if (topMember && !topMember.roles.cache.has(championRoleId)) {
            await topMember.roles.add(championRoleId);
          }
        }

        if (fs.existsSync(currentFile)) {
          current.completed = true;
          saveJSON(currentFile, current);
        }
      } else {
        if (
          channel &&
          (channel instanceof TextChannel ||
            channel instanceof NewsChannel ||
            channel instanceof ThreadChannel)
        ) {
          await channel.send({
            embeds: [
              {
                title: "❌ Incorrect Word",
                description: `${interaction.user.username} guessed **${guess}** — not the correct word.`,
                color: 0xe74c3c,
              },
            ],
          });
        }

        await interaction.reply({
          content: "❌ Incorrect guess.",
          ephemeral: true,
        });
      }

      return;
    }
  },
});
