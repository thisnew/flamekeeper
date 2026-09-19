import type { User } from "@prisma/client";
import { useSession } from "next-auth/react";

export type SafeUser = Omit<User, "passwordHash">;

export function isAdmin(user?: SafeUser | null): boolean {
  return user?.role === "ADMIN";
}

export function isOfficerOrAbove(user?: SafeUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "OFFICER";
}

export function isMemberOrAbove(user?: SafeUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "OFFICER" || user?.role === "MEMBER";
}

export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  return isAdmin(session?.user as SafeUser | undefined);
}

export function useIsOfficerOrAbove(): boolean {
  const { data: session } = useSession();
  return isOfficerOrAbove(session?.user as SafeUser | undefined);
}