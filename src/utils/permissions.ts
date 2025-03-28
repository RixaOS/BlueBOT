import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { config } from "../config.ts";

export function isAdminOrOwner(
  interaction: ChatInputCommandInteraction,
): boolean {
  const member = interaction.member;
  const userId = interaction.user.id;

  if (!member || typeof member === "string") return false;

  return (
    (member.permissions instanceof Object &&
      member.permissions.has(PermissionFlagsBits.Administrator)) ||
    userId === config.OWNER_ID
  );
}
