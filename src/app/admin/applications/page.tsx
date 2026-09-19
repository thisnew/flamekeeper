import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMemberOrAboveRole, isOfficerOrAboveRole } from "@/lib/roles";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ApplicationsClient from "@/components/admin/ApplicationsClient";

export const metadata: Metadata = { title: "入会审批 - 管理后台" };

async function getApplications() {
  try {
    return await prisma.application.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            email: true, name: true, status: true, emailVerified: true,
            referredBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminApplicationsPage() {
  const session = await auth();
  const user = session?.user as any;

  // Any approved member may review applications
  if (!user?.id) redirect("/auth/login");
  if (!isMemberOrAboveRole(user.role)) redirect("/pending");

  const isOfficer = isOfficerOrAboveRole(user.role);
  const applications = await getApplications();

  return (
    <div className="page-enter max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href={isOfficer ? "/admin" : "/roster"}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 返回{isOfficer ? "后台" : "成员名册"}
      </Link>
      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">入会审批</h1>
      <p className="text-sm text-text-muted mb-2">共 {applications.length} 条申请</p>
      <p className="text-xs text-text-muted mb-8">
        任何已入会的成员均可审批。你审批通过的用户，将自动记录为「由你引荐入会」。
      </p>

      <ApplicationsClient initial={applications as any} canDelete={isOfficer} />
    </div>
  );
}