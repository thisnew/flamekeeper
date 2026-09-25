import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** CredentialsSignin whose `code` is surfaced to the client (signIn result.code). */
class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

/**
 * JWT 回调 —— 每次会话读取都**从数据库刷新** role / status。
 *
 * 为什么不能只在登录时写一次：
 *   官员审批通过后改的是数据库，而 token 里仍是登录那一刻的旧值，导致
 *     - 个人中心的角色/状态一直显示「待审批」
 *     - requireMember() 把他一直重定向回 /pending
 *   直到本人退出重登才恢复。用户报的「审批通过后仍显示未通过」就是这个。
 *
 * 代价是每次读会话多一次主键查询（亚毫秒级），对本项目规模完全可接受；
 * 换来的是权限变更**立即生效**，不用等 token 过期。
 *
 * 单独导出是为了可测试 —— 见提交说明里的验证脚本。
 */
export async function jwtCallback({ token, user }: { token: any; user?: any }) {
  // 登录那一刻：把身份写进 token
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.status = user.status;
    // 显式写入，不依赖 NextAuth 的隐式拷贝 —— 隐式行为一旦变化，
    // 页头会莫名其妙地没有昵称，而且很难查
    token.name = user.name ?? null;
    return token;
  }

  // 后续请求：以数据库为准
  if (token.id) {
    const db = await prisma.user.findUnique({
      where: { id: String(token.id) },
      select: { role: true, status: true, name: true },
    });

    if (db) {
      token.role = db.role;
      token.status = db.status;
      // ⚠ `name` 也要刷新。NextAuth 只在**登录那一刻**写入 token.name，之后永不更新 ——
      //   成员在个人中心改了昵称，页头与名册却一直显示旧名字，非重新登录不可。
      //   这与 role/status 是同一类问题。
      token.name = db.name;
    } else {
      // 账号已不存在（例如入会申请被驳回后删号）—— 立即降级为普通注册用户，
      // 不让一个已被删除的账号继续持有成员/官员权限
      token.role = "USER";
      token.status = "REJECTED";
    }
  }

  return token;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          throw new LoginError("missing_fields");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          throw new LoginError("user_not_found");
        }

        if (!user.passwordHash) {
          throw new LoginError("no_password");
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          throw new LoginError("wrong_password");
        }

        // Email verification is mandatory before login, regardless of role/pending state.
        // Admins created by the seeder are verified at creation time.
        if (!user.emailVerified) {
          throw new LoginError("email_unverified");
        }

        if (user.status === "REJECTED") {
          throw new LoginError("account_rejected");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
        // 显式带上 name，别依赖 NextAuth 的默认行为 —— 它取的是 token 里的值，
        // 而 token 里的 name 由 jwtCallback 每次会话从库里刷新（见上）
        session.user.name = (token.name as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  // Trust all hosts in dev / behind reverse proxy; in production set AUTH_URL explicitly
  trustHost: true,
});