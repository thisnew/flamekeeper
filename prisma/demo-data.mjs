// OPT-IN demo data — creates a small referral hierarchy so the roster
// tree is visible immediately. Run explicitly:  node prisma/demo-data.mjs
// (NOT run by seed/deploy). Remove with: node prisma/demo-data.mjs --clean
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const CLEAN = process.argv.includes("--clean");
const DEMO_DOMAIN = process.env.DEMO_EMAIL_DOMAIN || "demo.local";

// [nickname, email-local, role, referrer email-local | null, characterName, class, spec, role, ilvl]
const PEOPLE = [
  ["烈焰指挥官", "demolead", "OFFICER", null, "阿什坎迪", "Warrior", "防护", "Tank", 636],
  ["霜语", "demo2", "MEMBER", "demolead", "霜之哀伤", "Death Knight", "鲜血", "Tank", 630],
  ["月影", "demo3", "MEMBER", "demolead", "月影疾风", "Druid", "恢复", "Healer", 628],
  ["雷牙", "demo4", "MEMBER", "demolead", "雷霆之怒", "Shaman", "恢复", "Healer", 622],
  ["午夜", "demo5", "MEMBER", "demo2", "午夜暗刃", "Rogue", "狂徒", "DPS", 631],
  ["星尘", "demo6", "MEMBER", "demo2", "星辰陨落", "Mage", "奥法", "DPS", 629],
  ["赤炎", "demo7", "MEMBER", "demo3", "赤炎之心", "Warlock", "毁灭", "DPS", 625],
  ["翠风", "demo8", "MEMBER", "demo3", "翠风行者", "Monk", "踏风", "DPS", 620],
  ["雪岭", "demo9", "MEMBER", "demo4", "雪岭巨兽", "Hunter", "射击", "DPS", 618],
];

async function clean() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) {
    console.log("没有需要清理的演示数据");
    return;
  }
  await prisma.character.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.updateMany({ where: { id: { in: ids } }, data: { referredById: null } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`✔ 已删除 ${ids.length} 个演示账号及其角色`);
}

async function main() {
  if (CLEAN) {
    await clean();
    return;
  }

  const passwordHash = await bcrypt.hash("demo12345", 12);

  // Map email-local -> user id, so children can point at their referrer
  const byLocal = new Map();

  for (const [nickname, local, role, referrerLocal, charName, cls, spec, charRole, ilvl] of PEOPLE) {
    const email = `${local}@${DEMO_DOMAIN}`;
    const referrerId = referrerLocal ? (byLocal.get(referrerLocal) ?? null) : null;

    const user = await prisma.user.upsert({
      where: { email },
      update: { role, referredById: referrerId },
      create: {
        email,
        passwordHash,
        name: nickname,
        role,
        status: "APPROVED",
        emailVerified: new Date(),
        referredById: referrerId,
      },
    });
    byLocal.set(local, user.id);

    const exists = await prisma.character.findFirst({ where: { userId: user.id, name: charName } });
    if (!exists) {
      await prisma.character.create({
        data: {
          userId: user.id,
          name: charName,
          server: "燃烧之刃",
          faction: "Horde",
          class: cls,
          spec,
          role: charRole,
          level: 80,
          itemLevel: ilvl,
          status: "ACTIVE",
          isPublic: true,
        },
      });
    }
  }

  console.log(`✔ 已创建 ${PEOPLE.length} 个演示成员（引荐层级 3 层）`);
  console.log("   登录密码统一为: demo12345");
  console.log("   访问 成员名册 → 结构图 查看引荐树");
  console.log("   清理: node prisma/demo-data.mjs --clean");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });