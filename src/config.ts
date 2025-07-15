import { z } from "zod";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export const srcPath = path.join(process.cwd(), "src");
export const dataPath = path.join(srcPath, "data");
export const resolveData = (...segments: string[]) =>
  path.join(dataPath, ...segments);

const configFile = path.join(srcPath, "data", "servers.json");

const schema = z.object({
  DISCORD_TOKEN: z.string(),
  npm_package_name: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DISCORD_DEV_GUILD_ID: z.string().optional(),
  OWNER_ID: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_EMAIL: z.string().optional(),
  SPOTIFY_PASSWORD: z.string().optional(),
  OPENAPI_KEY: z.string().optional(),
});

export function getServerConfig(guildId: string, key: string): string | null {
  if (!fs.existsSync(configFile)) return null;

  const servers = JSON.parse(fs.readFileSync(configFile, "utf8"));
  return servers[guildId]?.[key] ?? null;
}

const result = schema.safeParse(process.env);

if (!result.success) {
  throw new Error(result.error.message);
}

export const config = result.data;

export const openai = new OpenAI({
  apiKey: config.OPENAPI_KEY,
});

export function parseRichText(raw?: object | string): string {
  if (!raw) return "No description available.";

  function cleanRichText(node: any): any | null {
    if (!node || typeof node !== "object") return null;

    if (node.nodeType === "text" && !node.value?.trim()) return null;

    const cleanedContent = Array.isArray(node.content)
      ? node.content.map(cleanRichText).filter(Boolean)
      : undefined;

    const hasValue =
      node.nodeType === "text" &&
      typeof node.value === "string" &&
      node.value.trim();

    const hasChildren = cleanedContent && cleanedContent.length > 0;

    if (!hasValue && !hasChildren && node.nodeType !== "text") return null;

    const cleanedNode: any = { nodeType: node.nodeType };
    if (hasChildren) cleanedNode.content = cleanedContent;
    if (hasValue) cleanedNode.value = node.value;
    if (Array.isArray(node.marks) && node.marks.length > 0)
      cleanedNode.marks = node.marks;

    return cleanedNode;
  }

  function renderInline(nodes: any[]): string {
    return nodes
      .map((node) => {
        if (node.nodeType === "text" && typeof node.value === "string") {
          const isBold = node.marks?.some((m: any) => m.type === "bold");
          return isBold ? `**${node.value}**` : node.value;
        }
        if (Array.isArray(node.content)) {
          return renderInline(node.content);
        }
        return "";
      })
      .join("");
  }

  function extractText(
    nodes: any[],
    listType: "unordered" | "ordered" | null = null,
  ): string {
    let index = 1;

    return nodes
      .map((node) => {
        if (node.nodeType === "paragraph") {
          return renderInline(node.content ?? []);
        }

        if (node.nodeType === "list-item") {
          const text = extractText(node.content ?? []);
          return listType === "ordered" ? `${index++}. ${text}` : `• ${text}`;
        }

        if (node.nodeType === "unordered-list") {
          return extractText(node.content ?? [], "unordered");
        }

        if (node.nodeType === "ordered-list") {
          index = 1;
          return extractText(node.content ?? [], "ordered");
        }

        if (Array.isArray(node.content)) {
          return extractText(node.content, listType);
        }

        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const cleaned = cleanRichText(parsed);
    if (!cleaned?.content?.length) return "No description available.";

    return extractText(cleaned.content).trim() || "No description available.";
  } catch (err) {
    console.warn("❌ Failed to parse and clean rich text:", err);
    return "No description available.";
  }
}

export function parseRichBullets(raw?: string | object): string {
  if (!raw) return "";

  function extractListItems(nodes: any[]): string[] {
    return nodes.flatMap((node) => {
      if (node.nodeType === "list-item") {
        const inner = node.content?.flatMap(
          (child: any) =>
            child.content?.map((n: any) => {
              const isBold = n.marks?.some((m: any) => m.type === "bold");
              return isBold ? `**${n.value}**` : n.value;
            }) ?? [],
        );
        return [`• ${inner?.join("")?.trim()}`];
      }

      if (Array.isArray(node.content)) {
        return extractListItems(node.content);
      }

      return [];
    });
  }

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed?.content) return "";

    const items = extractListItems(parsed.content);
    return items.join("\n").trim();
  } catch (err) {
    console.warn("❌ Failed to parse bullet list:", err);
    return "";
  }
}
