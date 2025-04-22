import fs from "fs";
import path from "path";
import { createCommand } from "../../create-command.ts";
import {
  ApplicationCommandType,
  PermissionFlagsBits,
  ApplicationCommandOptionType,
  ChannelType,
} from "discord.js";

const getWhitelistPath = (guildId: string) =>
  path.join(__dirname, `../../data/moderation/whitelist_${guildId}.json`);

export function loadGuildWhitelist(guildId: string): {
  users: string[];
  channels: string[];
  patterns: string[];
} {
  const filePath = getWhitelistPath(guildId);
  if (!fs.existsSync(filePath)) {
    return { users: [], channels: [], patterns: [] };
  }

  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

export function saveGuildWhitelist(
  guildId: string,
  data: {
    users: string[];
    channels: string[];
    patterns: string[];
  },
) {
  const filePath = getWhitelistPath(guildId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export const whitelist = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "whitelist",
  description: "Add a user, channel, or pattern to the whitelist.",
  default_member_permissions: PermissionFlagsBits.Administrator.toString(), // ✅ hides for non-admins
  dm_permission: false, // ❌ don't allow in DMs
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "user",
      description: "Whitelist a user.",
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: "target",
          description: "The user to whitelist",
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "channel",
      description: "Whitelist a channel.",
      options: [
        {
          type: ApplicationCommandOptionType.Channel,
          name: "target",
          description: "The channel to whitelist",
          required: true,
          channel_types: [ChannelType.GuildText],
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "pattern",
      description: "Whitelist a phrase/pattern.",
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "text",
          description: "The pattern to whitelist",
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "remove",
      description: "Remove a user/channel/pattern from the whitelist.",
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "type",
          description: "Type to remove from",
          required: true,
          choices: [
            { name: "user", value: "users" },
            { name: "channel", value: "channels" },
            { name: "pattern", value: "patterns" },
          ],
        },
        {
          type: ApplicationCommandOptionType.String,
          name: "value",
          description: "ID or pattern text to remove",
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "view",
      description: "View the current whitelist.",
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "reset",
      description: "Reset the whitelist for this server.",
    },
  ],
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand(true);
    let whitelist = loadGuildWhitelist(guildId);

    if (sub === "user") {
      const userId = interaction.options.getUser("target", true).id;
      if (!whitelist.users.includes(userId)) whitelist.users.push(userId);
      saveGuildWhitelist(guildId, whitelist);
      await interaction.reply({
        content: `✅ Whitelisted user: <@${userId}>`,
        ephemeral: true,
      });
    } else if (sub === "channel") {
      const channelId = interaction.options.getChannel("target", true).id;
      if (!whitelist.channels.includes(channelId))
        whitelist.channels.push(channelId);
      saveGuildWhitelist(guildId, whitelist);
      await interaction.reply({
        content: `✅ Whitelisted channel: <#${channelId}>`,
        ephemeral: true,
      });
    } else if (sub === "pattern") {
      const text = interaction.options.getString("text", true);
      if (!whitelist.patterns.includes(text)) whitelist.patterns.push(text);
      saveGuildWhitelist(guildId, whitelist);
      await interaction.reply({
        content: `✅ Whitelisted pattern: \`${text}\``,
        ephemeral: true,
      });
    } else if (sub === "remove") {
      const type = interaction.options.getString("type", true) as
        | "users"
        | "channels"
        | "patterns";
      const value = interaction.options.getString("value", true);
      const index = whitelist[type].indexOf(value);
      if (index === -1)
        await interaction.reply({
          content: `❌ Not found in whitelist.`,
          ephemeral: true,
        });
      whitelist[type].splice(index, 1);
      saveGuildWhitelist(guildId, whitelist);
      await interaction.reply({
        content: `✅ Removed from ${type}: \`${value}\``,
        ephemeral: true,
      });
    } else if (sub === "view") {
      const formatted = [
        `**Users**: ${whitelist.users.map((id) => `<@${id}>`).join(", ") || "None"}`,
        `**Channels**: ${whitelist.channels.map((id) => `<#${id}>`).join(", ") || "None"}`,
        `**Patterns**: ${whitelist.patterns.map((p) => `\`${p}\``).join(", ") || "None"}`,
      ].join("\n");
      await interaction.reply({
        content: `📋 Whitelist for this server:\n${formatted}`,
        ephemeral: true,
      });
    } else if (sub === "reset") {
      whitelist = { users: [], channels: [], patterns: [] };
      saveGuildWhitelist(guildId, whitelist);
      await interaction.reply({
        content: "✅ Whitelist has been reset.",
        ephemeral: true,
      });
    } else {
      // Fallback: send as normal message
      await interaction.reply({
        content: `❌ Unknown subcommand.`,
        ephemeral: true,
      });
    }
    return;
  },
});
