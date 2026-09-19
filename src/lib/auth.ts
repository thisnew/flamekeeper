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

        if (user.status === "PENDING_EMAIL") {
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.status = (user as any).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
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