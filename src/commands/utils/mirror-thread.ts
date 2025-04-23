import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ChannelType,
  ForumChannel,
  EmbedBuilder,
  Colors,
  ThreadChannel,
} from "discord.js";
import { createCommand } from "../../create-command.ts";

export const mirrorThread = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "mirror-thread",
  description: "Mirror a forum post to another server's forum channel.",
  options: [
    {
      name: "source_channel",
      description: "ID of the source forum channel",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "thread_id",
      description: "ID of the thread to copy",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "target_channel",
      description: "ID of the forum channel to mirror to (in another server)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sourceChannelId = interaction.options.getString(
      "source_channel",
      true,
    );
    const threadId = interaction.options.getString("thread_id", true);
    const targetChannelId = interaction.options.getString(
      "target_channel",
      true,
    );

    // Fetch source forum channel
    const rawSource = await interaction.client.channels
      .fetch(sourceChannelId)
      .catch(() => null);
    const sourceChannel =
      rawSource?.type === ChannelType.GuildForum
        ? (rawSource as ForumChannel)
        : null;

    // Fetch thread and validate
    const rawThread = await interaction.client.channels
      .fetch(threadId)
      .catch(() => null);
    const thread = rawThread?.isThread() ? (rawThread as ThreadChannel) : null;

    // Fetch target forum channel
    const rawTarget = await interaction.client.channels
      .fetch(targetChannelId)
      .catch(() => null);
    const targetChannel =
      rawTarget?.type === ChannelType.GuildForum
        ? (rawTarget as ForumChannel)
        : null;

    if (!sourceChannel || !thread || !targetChannel) {
      await interaction.editReply(
        "❌ Invalid source channel, thread, or target channel.",
      );
      return;
    }

    // Fetch first message from thread
    const messages = await thread.messages.fetch({ limit: 100 });
    const firstMessage = messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .first();

    if (!firstMessage) {
      await interaction.editReply(
        "❌ Could not read the original thread's content.",
      );
      return;
    }

    const originalAuthor = firstMessage.author;
    const attachments = [...firstMessage.attachments.values()];

    // 🏷️ Get original tag names from source thread
    const originalAppliedTagIds = thread.appliedTags ?? [];
    const originalTagNames = sourceChannel.availableTags
      .filter((tag) => originalAppliedTagIds.includes(tag.id))
      .map((tag) => tag.name);

    // 🔄 Match or create tags in target forum
    const matchingTargetTagIds: string[] = [];
    const missingTagNames: string[] = [];

    for (const tagName of originalTagNames) {
      const existing = targetChannel.availableTags.find(
        (tag) => tag.name === tagName,
      );
      if (existing) {
        matchingTargetTagIds.push(existing.id);
      } else {
        missingTagNames.push(tagName);
      }
    }

    // ➕ Create missing tags in target forum
    for (const tagName of missingTagNames) {
      try {
        const existingTags = targetChannel.availableTags;

        // Skip if we're at tag limit (50)
        if (existingTags.length >= 50) {
          console.warn("⚠️ Tag limit reached in target forum channel.");
        } else {
          const updatedTags = [
            ...existingTags,
            { name: tagName, moderated: false },
          ];

          try {
            const updatedChannel =
              await targetChannel.setAvailableTags(updatedTags);

            const createdTag = updatedChannel.availableTags.find(
              (tag) => tag.name === tagName,
            );
            if (createdTag) matchingTargetTagIds.push(createdTag.id);
          } catch (err) {
            console.warn(`⚠️ Failed to create tag "${tagName}":`, err);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Failed to create tag "${tagName}":`, err);
      }
    }

    // 📤 Mirror the thread
    const mirroredThread = await targetChannel.threads.create({
      name: thread.name,
      appliedTags: matchingTargetTagIds, // or [] if none
      message: {
        content: `👤 Original post by <@${originalAuthor.id}>\n\n---\n${firstMessage.content}`,
        files: attachments.map((a) => ({
          attachment: a.url,
          name: a.name,
        })),
      },
    });

    // ✅ Confirmation embed
    const embed = new EmbedBuilder()
      .setTitle("🔁 Thread Mirrored")
      .setColor(Colors.Green)
      .addFields(
        {
          name: "📥 Original Thread",
          value: `[Jump](https://discord.com/channels/${thread.guildId}/${thread.id})`,
        },
        {
          name: "📤 New Thread",
          value: `[Jump](https://discord.com/channels/${mirroredThread.guildId}/${mirroredThread.id})`,
        },
        {
          name: "🏷️ Tags Applied",
          value:
            matchingTargetTagIds.length > 0
              ? matchingTargetTagIds.length.toString()
              : "None",
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
});
