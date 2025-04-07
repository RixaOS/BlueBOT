import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
} from "discord.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createCommand } from "../../create-command.ts";
import { isAdminOrOwner } from "../../utils/permissions.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_DIR = path.join(__dirname, "..", "..", "data");
const CONFIG_FILE = path.join(CONFIG_DIR, "servers.json");

function loadJSON(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJSON(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const setup = createCommand({
  type: ApplicationCommandType.ChatInput,
  name: "setup",
  description: "Configure server settings for different modules.",
  default_member_permissions: PermissionFlagsBits.Administrator.toString(), // ✅ hides for non-admins
  dm_permission: false, // ❌ don't allow in DMs
  options: [
    {
      name: "wordle",
      description: "Configure Wordle game settings for this server.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "game_channel_id",
          description: "Channel ID for Wordle messages",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "champion_role_id",
          description: "Champion role ID to award top scorers",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "general",
      description: "Configure general bot settings for this server.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "mod_role_id",
          description: "Role ID with mod permissions",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "log_channel_id",
          description: "Optional log channel ID for message logging",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "notify_channel_id",
          description: "Optional channel ID to notify users of a warning",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (!isAdminOrOwner(interaction)) {
      await interaction.reply({
        content: "🚫 You do not have permission to run this command.",
        ephemeral: true,
      });
      return;
    }

    const servers = fs.existsSync(CONFIG_FILE) ? loadJSON(CONFIG_FILE) : {};
    servers[guild.id] = servers[guild.id] || {};

    if (sub === "wordle") {
      const gameChannelId = interaction.options.getString(
        "game_channel_id",
        true,
      );
      const wordleRoleId = interaction.options.getString(
        "champion_role_id",
        false,
      );

      servers[guild.id] = {
        ...servers[guild.id],
        gameChannelId: gameChannelId,
        wordleRoleId,
      };

      saveJSON(CONFIG_FILE, servers);

      await interaction.reply({
        content: "✅ Wordle setup saved successfully!",
        ephemeral: true,
      });
      return;
    }

    if (sub === "general") {
      const modRoleId = interaction.options.getString("mod_role_id", true);
      const logChannelId = interaction.options.getString(
        "log_channel_id",
        false,
      );
      const notifyChannelId = interaction.options.getString(
        "notify_channel_id",
        false,
      );

      servers[guild.id] = {
        ...servers[guild.id],
        modRoleId,
        logChannelId,
        notifyChannelId,
      };
      saveJSON(CONFIG_FILE, servers);
      await interaction.reply({
        content: "✅ Setup completed!",
        ephemeral: true,
      });
      return;
    }

    // 🔒 Catch unknown subcommands so we don't silently fail
    await interaction.reply({
      content: `⚠️ Unknown subcommand: \`${sub}\`. Please use \`wordle\` or \`general\`.`,
      ephemeral: true,
    });
  },
});
