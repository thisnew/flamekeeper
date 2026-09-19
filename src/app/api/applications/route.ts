import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isOfficerOrAboveRole } from "@/lib/roles";

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isOfficerOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const list = await prisma.application.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { user: { select: { id: true, email: true, name: true, status: true } } },
    });
    return NextResponse.json({ applications: list });
  } catch (error) {
    console.error("Applications GET:", error);
    return NextResponse.json({ error: "获取申请列表失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const actor = session?.user as any;
    if (!actor?.id || !isOfficerOrAboveRole(actor.role)) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const body = await req.json();
    const { applicationId, action, note } = body as {
      applicationId: string;
      action: "APPROVE" | "REJECT" | "NEEDS_INFO";
      note?: string;
    };

    if (!applicationId || !action) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });
    if (!application) {
      return NextResponse.json({ error: "申请不存在" }, { status: 404 });
    }

    const newStatus =
      action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "NEEDS_INFO";

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { status: newStatus, officerNote: note || null },
      });

      if (action === "APPROVE") {
        await tx.user.update({
          where: { id: application.userId },
          data: {
            status: "APPROVED",
            role: application.user.role === "USER" ? "MEMBER" : application.user.role,
          },
        });
        const exists = await tx.character.findFirst({
          where: { userId: application.userId, name: application.characterName },
        });
        if (!exists) {
          await tx.character.create({
            data: {
              userId: application.userId,
              name: application.characterName,
              server: application.server,
              faction: application.faction,
              class: application.class,
              spec: application.spec,
              itemLevel: application.itemLevel,
              role: "DPS",
              status: "ACTIVE",
              isPublic: true,
            },
          });
        }
      } else if (action === "REJECT") {
        await tx.user.update({
          where: { id: application.userId },
          data: { status: "REJECTED" },
        });
      } else {
        await tx.user.update({
          where: { id: application.userId },
          data: { status: "NEEDS_INFO" },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: application.userId,
          action: `APPLICATION_${action}`,
          detail: note || `Officer action on application ${application.applicationCode}`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "操作成功" });
  } catch (error) {
    console.error("Applications PATCH:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

// DELETE /api/applications?id=xxx — remove an application record
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const actor = session?.user as any;
    if (!actor?.id || !isOfficerOrAboveRole(actor.role)) {
      return NextResponse.json({ error: "无权删除" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ error: "申请不存在" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.application.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "APPLICATION_DELETE",
          detail: `Deleted application ${application.applicationCode} (${application.characterName})`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "申请已删除" });
  } catch (error) {
    console.error("Applications DELETE:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}