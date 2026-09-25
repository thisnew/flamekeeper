import { prisma } from "@/lib/prisma";
import { listWtfFiles } from "@/lib/wtf-storage";

/**
 * 「个人中心 → 我的角色」需要的一份数据。
 *
 * 抽出来是因为它有**两个消费者**：
 *   - `GET /api/profile/wtf`（客户端组件用）
 *   - `app/profile/page.tsx`（服务端组件直接调）
 *
 * 两边必须取同样的东西，否则「接口拿到的」和「页面渲染的」会不一致 ——
 * 这种不一致正是个人中心数据点了不刷新的根源之一。
 */
export type WtfSummary = {
  accounts: { accountName: string; realmCount: number }[];
  characters: {
    id: string;
    name: string;
    server: string;
    accountName: string | null;
    sortOrder: number;
    isMain: boolean;
    /** 有值 = 是公会成员（可设主力、进公会名单） */
    guildMemberId: string | null;
  }[];
  fileCount: number;
  totalBytes: number;
};

export async function getWtfSummary(userId: string): Promise<WtfSummary> {
  const [accounts, characters, files] = await Promise.all([
    prisma.wtfAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { accountName: true, realmCount: true },
    }),
    prisma.character.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        server: true,
        accountName: true,
        sortOrder: true,
        isMain: true,
        guildMemberId: true,
      },
    }),
    listWtfFiles(userId),
  ]);

  return {
    accounts,
    characters,
    fileCount: files.length,
    totalBytes: files.reduce((s, f) => s + f.size, 0),
  };
}
