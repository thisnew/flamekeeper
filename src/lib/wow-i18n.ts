/**
 * 魔兽世界游戏术语的中文显示。
 *
 * Raider.IO 返回的是**英文**（`class: "Rogue"`、`active_spec_name: "Subtlety"`、
 * `active_spec_role: "HEALING"`），而这些值要展示给中文用户。
 * 这里集中做「英文 → 中文」的转换，不要在组件里各写一份。
 *
 * ## 关于专精重名
 *
 * 英文专精名在不同职业间会重复：`Protection`（战士/圣骑士）、
 * `Holy`（牧师/圣骑士）、`Frost`（法师/死亡骑士）、`Restoration`（德鲁伊/萨满）。
 *
 * 好消息是**官方中文译名也重复**，所以一张平表就够了：
 *   战士 Protection = 防护、圣骑士 Protection 也是 防护
 *   法师 Frost = 冰霜、死亡骑士 Frost 也是 冰霜
 * 因此不需要「职业+专精」联合键。若将来出现译名不同的重名，
 * 用 `SPEC_LABELS_BY_CLASS`（键 `${职业}|${专精}`）单独覆盖即可。
 *
 * ## 关于职能
 *
 * ⚠ 实测 Raider.IO 返回的是 **`HEALING`**，不是 `HEALER`。
 * 早期只写了 `HEALER`，导致治疗职业在页面上显示成原始的 "HEALING"。
 * 两个都收，避免再次踩坑。
 */

/** 职业：英文 → 中文（13 个职业） */
export const WOW_CLASS_LABELS: Record<string, string> = {
  Warrior: "战士",
  Paladin: "圣骑士",
  Hunter: "猎人",
  Rogue: "潜行者",
  Priest: "牧师",
  "Death Knight": "死亡骑士",
  Shaman: "萨满祭司",
  Mage: "法师",
  Warlock: "术士",
  Monk: "武僧",
  Druid: "德鲁伊",
  "Demon Hunter": "恶魔猎手",
  Evoker: "唤魔师",
};

/**
 * 专精：英文 → 中文。
 * 重名的几个（Protection / Holy / Frost / Restoration）中文译名相同，故可平铺。
 */
export const WOW_SPEC_LABELS: Record<string, string> = {
  // 战士
  Arms: "武器",
  Fury: "狂怒",
  Protection: "防护",
  // 圣骑士
  Holy: "神圣",
  Retribution: "惩戒",
  // 猎人
  "Beast Mastery": "兽王",
  Marksmanship: "射击",
  Survival: "生存",
  // 潜行者
  Assassination: "奇袭",
  Outlaw: "狂徒",
  Subtlety: "敏锐",
  // 牧师
  Discipline: "戒律",
  Shadow: "暗影",
  // 死亡骑士
  Blood: "鲜血",
  Frost: "冰霜",
  Unholy: "邪恶",
  // 萨满祭司（Restoration 已在上方）
  Elemental: "元素",
  Enhancement: "增强",
  Restoration: "恢复",
  // 法师
  Arcane: "奥术",
  Fire: "火焰",
  // 术士
  Affliction: "痛苦",
  Demonology: "恶魔学识",
  Destruction: "毁灭",
  // 武僧
  Brewmaster: "酒仙",
  Mistweaver: "织雾",
  Windwalker: "踏风",
  // 德鲁伊
  Balance: "平衡",
  Feral: "野性",
  Guardian: "守护",
  // 恶魔猎手
  Havoc: "浩劫",
  Vengeance: "复仇",
  Devourer: "噬灭",
  // 唤魔师
  Devastation: "湮灭",
  Preservation: "恩护",
  Augmentation: "增辉",
};

/**
 * 重名专精的**按职业覆盖**（键 `${职业英文}|${专精英文}`）。
 * 目前官方译名与平表一致，留空即可；将来译名分化时在这里加。
 */
export const WOW_SPEC_LABELS_BY_CLASS: Record<string, string> = {};

/** 职能：英文 → 中文。`HEALING` 与 `HEALER` 都收（实测是前者）。 */
export const WOW_ROLE_LABELS: Record<string, string> = {
  TANK: "坦克",
  HEALING: "治疗",
  HEALER: "治疗",
  DPS: "输出",
  MELEE: "近战",
  RANGED: "远程",
};

/** 职业 → 中文；未知值原样返回，方便发现新数据而不是显示成空白。 */
export function classLabel(en: string | null | undefined): string | null {
  if (!en) return null;
  return WOW_CLASS_LABELS[en] ?? en;
}

/** 专精 → 中文；先查「职业|专精」覆盖，再查平表。 */
export function specLabel(
  en: string | null | undefined,
  className?: string | null
): string | null {
  if (!en) return null;
  if (className) {
    const byClass = WOW_SPEC_LABELS_BY_CLASS[`${className}|${en}`];
    if (byClass) return byClass;
  }
  return WOW_SPEC_LABELS[en] ?? en;
}

/** 职能 → 中文；大小写不敏感（API 偶有大小写差异）。 */
export function roleLabel(en: string | null | undefined): string | null {
  if (!en) return null;
  return WOW_ROLE_LABELS[en.toUpperCase()] ?? en;
}

/** 「职业 专精」合并显示用，例如「潜行者 · 敏锐」。 */
export function classSpecLabel(
  className: string | null | undefined,
  specName: string | null | undefined
): string | null {
  const c = classLabel(className);
  const s = specLabel(specName, className);
  if (!c && !s) return null;
  if (!s) return c;
  if (!c) return s;
  return `${c} · ${s}`;
}
