import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole, isOfficerOrAboveRole, isAdminRole } from "@/lib/roles";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  status?: string;
}

/** Member-only area: must be logged in AND approved (MEMBER/OFFICER/ADMIN). */
export async function requireMember(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) redirect("/auth/login");
  if (!isMemberOrAboveRole(user.role)) redirect("/pending");
  return user as SessionUser;
}

/** Officer-only area. */
export async function requireOfficer(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) redirect("/auth/login");
  if (!isOfficerOrAboveRole(user.role)) redirect("/pending");
  return user as SessionUser;
}

/** Admin-only area. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) redirect("/auth/login");
  if (!isAdminRole(user.role)) redirect("/pending");
  return user as SessionUser;
}