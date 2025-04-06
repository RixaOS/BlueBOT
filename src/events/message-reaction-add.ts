import { Events, Colors, EmbedBuilder } from "discord.js";
import { createEvent } from "../create-event.ts";
import { getServerConfig } from "../config.ts";
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

export const messageReactionAdd = createEvent({
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (user.bot || !reaction.message.guild || !reaction.message.embeds.length)
      return;

    const logMessage = reaction.message;
    const pending = loadPending();
    const caseData = pending[logMessage.id];
    if (!caseData) return;

    const {
      guildId,
      userId,
      originalMessageId,
      originalMessageChannelId,
      originalContent,
      reason,
    } = caseData;
    const guild = logMessage.guild;
    if (!guild) return;

    //   For future reference just in case:
    //   if (!member.permissions.has("ModerateMembers") && user.id !== "YOUR_OWNER_ID") return;

    const originalChannel = guild.channels.cache.get(originalMessageChannelId);
    const originalMsg = originalChannel?.isTextBased()
      ? await originalChannel.messages
          .fetch(originalMessageId)
          .catch(() => null)
      : null;

    // ✅ APPROVED
    if (reaction.emoji.name === "✅") {
      const originalEmbed = logMessage.embeds[0];
      if (!originalEmbed) return; // or handle with a warning/log

      const embed = new EmbedBuilder()
        .setTitle("✅ Message approved")
        .setColor(Colors.Green)
        .addFields({
          name: "📨 Message Content",
          value: caseData.originalContent.slice(0, 1024) || "*[No content]*",
        })
        .setFooter({ text: `Approved by ${user.tag}` })
        .setTimestamp();

      await logMessage.edit({ embeds: [embed] });

      delete pending[logMessage.id];
      savePending(pending);
      return;
    }

    // ❌ DECLINED
    if (reaction.emoji.name === "❌") {
      // 1. Delete the original flagged message
      await originalMsg?.delete().catch(() => {});

      // 2. Notify user in configured notify channel
      const notifyChannelId = getServerConfig(guildId, "notifyChannelId");
      if (!notifyChannelId) {
        console.warn(`⚠️ No notifyChannelId configured for guild ${guildId}`);
      } else {
        const notifyChannel =
          reaction.message.guild.channels.cache.get(notifyChannelId);
        if (notifyChannel?.isTextBased()) {
          await notifyChannel.send({
            content: `<@${userId}> your message was removed due to rule violations.\n**Reason:** ${reason}`,
          });
        } else {
          console.warn(
            `⚠️ Notify channel ${notifyChannelId} is not text-based or invalid.`,
          );
        }
      }

      // 2️⃣ Write to warnings_<guildId>.json (safe fallback)
      const warningsDir = path.resolve("src/data/moderation");
      if (!fs.existsSync(warningsDir))
        fs.mkdirSync(warningsDir, { recursive: true });

      const warningsFile = path.resolve(
        `src/data/moderation/warnings_${guildId}.json`,
      );
      let warnings: any[] = [];

      try {
        if (fs.existsSync(warningsFile)) {
          warnings = JSON.parse(fs.readFileSync(warningsFile, "utf-8"));
        } else {
          // File doesn't exist yet, create it
          fs.writeFileSync(warningsFile, "[]");
          console.log(`📝 Created new warnings file: ${warningsFile}`);
        }
      } catch (err) {
        console.error("❌ Failed to read or create warnings file:", err);
      }

      warnings.push({
        userId,
        modId: user.id,
        timestamp: Date.now(),
        message: originalContent,
        reason,
      });

      try {
        fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
        console.log(`✅ Warning written for user ${userId}`);
      } catch (err) {
        console.error("❌ Failed to write warning log:", err);
      }

      // 4. Update the mod log embed
      const originalEmbed = logMessage.embeds[0];
      if (!originalEmbed) return; // or handle with a warning/log

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Warning Issued and recorded")
        .setColor(Colors.Red)
        .addFields(
          {
            name: "👤 User",
            value: `<@${userId}>`,
            inline: true,
          },
          {
            name: "🧾 Reason",
            value: reason,
          },
          {
            name: "🛡️ Issued By",
            value: `${user.tag}`,
            inline: true,
          },
        );

      await logMessage.edit({ embeds: [embed] });

      // 5. Clean up
      delete pending[logMessage.id];
      savePending(pending);
    }
  },
});
