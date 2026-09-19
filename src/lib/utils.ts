import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}

// WoW class name => CSS class mapping
export const CLASS_COLORS: Record<string, string> = {
  "Death Knight": "text-death-knight",
  "Demon Hunter": "text-demon-hunter",
  Druid: "text-druid",
  Evoker: "text-evoker",
  Hunter: "text-hunter",
  Mage: "text-mage",
  Monk: "text-monk",
  Paladin: "text-paladin",
  Priest: "text-priest",
  Rogue: "text-rogue",
  Shaman: "text-shaman",
  Warlock: "text-warlock",
  Warrior: "text-warrior",
};

export const WOW_CLASSES = [
  "Warrior", "Paladin", "Hunter", "Rogue", "Priest",
  "Death Knight", "Shaman", "Mage", "Warlock", "Monk",
  "Druid", "Demon Hunter", "Evoker",
] as const;

export const WOW_SERVERS = [
  "白银之手", "血色十字军", "死亡之翼", "末日行者", "安苏",
  "燃烧之刃", "摩摩尔", "格瑞姆巴托", "伊森利恩", "国王之谷",
] as const;

export const FACTION_NAMES: Record<string, string> = {
  Alliance: "联盟",
  Horde: "部落",
};