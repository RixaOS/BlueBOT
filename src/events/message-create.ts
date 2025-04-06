import { Events, EmbedBuilder, Colors } from "discord.js";
import { createEvent } from "../create-event.ts";
import OpenAI from "openai";
import { config, getServerConfig } from "../config.ts";
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

const openai = new OpenAI({ apiKey: config.OPENAPI_KEY });

const INVITE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i;

export const messageCreate = createEvent({
  name: Events.MessageCreate,
  async execute(message) {
    if (
      message.author.bot ||
      !message.inGuild() ||
      !message.content ||
      message.content.length < 5 ||
      !openai
    )
      return;

    const guildId = message.guild.id;
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
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You're a moderation assistant for a Discord server.
            Only flag messages that include:
            - hate speech or slurs
            - violent threats
            - targeted harassment

            Ignore sarcasm, mild language, or personal disagreements.

            Respond with JSON:
            {
            "violation": true | false,
            "severity": "low" | "medium" | "high",
            "reason": "Short explanation of why this message was flagged"
            }

            Only respond with the JSON.`,
          },
          {
            role: "user",
            content: message.content,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      const result = raw ? JSON.parse(raw) : null;
      if (!result || !result.violation) return;

      const { severity, reason } = result;

      const messageLink = message.guild
        ? `[Click to view](https://discord.com/channels/${message.guild.id}/${message.channelId}/${message.id})`
        : "*Unavailable*";

      // 📝 Log to mod channel
      if (modChannel?.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle("🚨 Message Flagged by AI")
          .setColor(
            severity === "high"
              ? Colors.Red
              : severity === "medium"
                ? Colors.Orange
                : Colors.Yellow,
          )
          .addFields(
            {
              name: "User",
              value: `<@${message.author.id}> (${message.author.tag})`,
            },
            { name: "Channel", value: `<#${message.channel.id}>` },
            { name: "Message", value: message.content.slice(0, 1024) },
            { name: "Jump to Message", value: messageLink },
            { name: "Reason", value: reason },
            { name: "Severity", value: severity, inline: true },
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
    } catch (err) {
      console.error("❌ Moderation error:", err);
    }
  },
});
