import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    const newStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "NEEDS_INFO";

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { status: newStatus, officerNote: note || null },
      });

      // Promote user to MEMBER + APPROVED if approved
      if (action === "APPROVE") {
        await tx.user.update({
          where: { id: application.userId },
          data: { status: "APPROVED", role: application.user.role === "USER" ? "MEMBER" : application.user.role },
        });
        // Create / link Character record
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