import { Events, EmbedBuilder, Colors } from "discord.js";
import { createEvent } from "../create-event.ts";
import { getServerConfig, openai, srcPath } from "../config.ts";
import fs from "fs";
import path from "path";

const pendingFilePath = path.resolve("src/data/moderation/pending.json");

function loadPending(): Record<string, any> {
  try {
    if (!fs.existsSync(pendingFilePath)) {
      fs.mkdirSync(path.dirname(pendingFilePath), { recursive: true });
      fs.writeFileSync(pendingFilePath, "{}");
    }
    return JSON.parse(fs.readFileSync(pendingFilePath, "utf-8"));
  } catch {
    return {};
  }
}

function savePending(data: Record<string, any>) {
  fs.writeFileSync(pendingFilePath, JSON.stringify(data, null, 2));
}

const INVITE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i;

export const messageCreate = createEvent({
  name: Events.MessageCreate,
  async execute(message) {
    // const { logger } = context;
    if (
      message.author.bot ||
      !message.inGuild() ||
      !message.content ||
      message.content.length < 2 ||
      !openai
    )
      return;

    const guildId = message.guild.id;
    const whitelistPath = path.join(
      srcPath,
      "data",
      `/moderation/whitelist_${guildId}.json`,
    );

    // 🛑 Forbidden word(s)
    const blackWord = message.content.match("cancer");
    if (blackWord) {
      await message.delete().catch(() => {});
      return;
    }

    if (fs.existsSync(whitelistPath)) {
      const whitelist = fs.existsSync(whitelistPath)
        ? JSON.parse(fs.readFileSync(whitelistPath, "utf8"))
        : { users: [], channels: [], patterns: [] };

      const isWhitelistedUser = whitelist.users.includes(message.author.id);
      const isWhitelistedChannel = whitelist.channels.includes(
        message.channel.id,
      );
      const isWhitelistedPattern = whitelist.patterns.some((pattern: string) =>
        message.content.toLowerCase().includes(pattern.toLowerCase()),
      );

      if (isWhitelistedUser || isWhitelistedChannel || isWhitelistedPattern) {
        return; // ✅ Skip moderation
      }
    }

    const logChannelId = getServerConfig(guildId, "logChannelId");
    const modChannel = logChannelId
      ? message.guild.channels.cache.get(logChannelId)
      : null;

    // 🛑 Check for Discord invite link
    const inviteMatch = message.content.match(INVITE_REGEX);
    if (inviteMatch) {
      await message.delete().catch(() => {});
      return;
    }

    // 🔍 Use GPT to evaluate for toxicity/rule breaking
    try {
      const response = await openai.moderations.create({
        input: message.content,
      });

      const results = response.results[0];

      if (results?.flagged) {
        const flaggedCategories = Object.entries(results.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category]) => category);

        // If only "violence" was flagged,
        if (flaggedCategories[0] === "sexual") {
          return;
        }

        const messageLink = message.guild
          ? `[Click to view](https://discord.com/channels/${message.guild.id}/${message.channelId}/${message.id})`
          : "*Unavailable*";

        const reason = Object.entries(results.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category]) => category)
          .join(", ");

        // 📝 Log to mod channel
        if (modChannel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle("🚨 Message Flagged by AI")
            .setColor(Colors.DarkVividPink)
            .addFields(
              {
                name: "User",
                value: `<@${message.author.id}> (${message.author.tag})`,
              },
              { name: "Channel", value: `<#${message.channel.id}>` },
              { name: "Message", value: message.content.slice(0, 1024) },
              { name: "Jump to Message", value: messageLink },
              { name: "Reason", value: reason },
            )
            .setTimestamp();

          const logMessage = await modChannel.send({ embeds: [embed] });

          await logMessage.react("✅"); // Approve
          await logMessage.react("❌"); // Decline

          const pending = loadPending();
          pending[logMessage.id] = {
            guildId: message.guild.id,
            userId: message.author.id,
            originalMessageId: message.id,
            originalMessageChannelId: message.channel.id,
            originalContent: message.content,
            reason,
          };
          savePending(pending);
        }
      }
    } catch (err) {
      console.error("❌ Moderation error:", err);
    }
  },
});
