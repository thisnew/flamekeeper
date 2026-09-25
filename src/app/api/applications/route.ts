import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isOfficerOrAboveRole, isMemberOrAboveRole } from "@/lib/roles";
import { appUrl } from "@/lib/app-url";
import {
  applicationRejectedEmailHtml,
  isMailConfigured,
  sendMail,
} from "@/lib/mailer";

/**
 * 入会申请列表 —— GET **只服务于个人中心**。
 *
 * 后台审批页的数据由服务端组件直接查库（`app/admin/applications/page.tsx`），
 * 这个接口的 GET 只有 `/profile` 在调，所以它必须**只返回调用者本人**的申请。
 *
 * ⚠ 这里曾经写成「返回全站所有人的申请 + include user」，
 *   于是**任何已通过成员都能看到别人的申请**，网络面板里连邮箱都能看到。
 *   权限判断 `isMemberOrAboveRole` 挡住的是未登录/待审批者，
 *   挡不住「成员 A 看成员 B」—— 必须按 userId 收窄。
 *
 * 另外**不返回已通过的**：审批通过后成员没必要再看一遍「已通过」，
 * 完整记录在后台随时可查。
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isMemberOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const list = await prisma.application.findMany({
      where: { userId: user.id, status: { not: "APPROVED" } },
      orderBy: [{ createdAt: "desc" }],
      // 不收 `user` —— 自己的邮箱没必要随列表回传，也避免再次出现越权字段
      select: {
        id: true,
        status: true,
        applicationCode: true,
        characterName: true,
        officerNote: true,
        createdAt: true,
        updatedAt: true,
      },
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
    if (!actor?.id || !isMemberOrAboveRole(actor.role)) {
      return NextResponse.json({ error: "仅公会成员可审批" }, { status: 403 });
    }

    const body = await req.json();
    const { applicationId, action, note } = body as {
      applicationId: string;
      // ⚠ 已移除 NEEDS_INFO：入会申请只有「通过」和「驳回」两种处置。
      //   曾经用过「要求补充信息」，但那个状态既要成员回站补充、又没有回填入口，
      //   实际只会让申请卡住 —— 需要沟通时直接驳回或线下联系更干脆。
      action: "APPROVE" | "REJECT";
      note?: string;
    };

    if (!applicationId || !action) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "未知的审批操作" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });
    if (!application) {
      return NextResponse.json({ error: "申请不存在" }, { status: 404 });
    }

    // 先把要用的信息取出来 —— 驳回会删号，删完就查不到了
    const targetUserId = application.userId;
    const targetEmail = application.user.email;
    const targetName = application.user.name ?? "";
    const appCode = application.applicationCode;
    const trimmedNote = note?.trim() || "";

    await prisma.$transaction(async (tx) => {
      if (action === "APPROVE") {
        await tx.application.update({
          where: { id: applicationId },
          data: { status: "APPROVED", officerNote: trimmedNote || null },
        });
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            status: "APPROVED",
            role: application.user.role === "USER" ? "MEMBER" : application.user.role,
            // 审批人自动成为被审批人的引荐人（管理员可在「成员与会阶」里再调整）
            referredById: application.user.referredById ?? actor.id,
          },
        });
        // 注意：**不再**从申请里创建角色。注册只填昵称、没有游戏信息，
        // 角色改由「个人信息 → WTF 导入」或后台名册维护产生。
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: "APPLICATION_APPROVE",
            detail: `通过 ${targetEmail} 的入会申请（${appCode}）${
              trimmedNote ? `：${trimmedNote}` : ""
            }`,
          },
        });
      } else if (action === "REJECT") {
        // 驳回 = 注册失败：账号注销、邮箱释放，对方可用同一邮箱重新注册。
        //
        // 审计必须挂在**操作者**身上（AuditLog.userId → User 有外键），
        // 因为目标账号紧接着就要被删除；把对方邮箱写进 detail 留住线索。
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: "APPLICATION_REJECT",
            detail: `驳回并入会失败，已删除账号 ${targetEmail}（${appCode}）${
              trimmedNote ? `：${trimmedNote}` : ""
            }`,
          },
        });
        // ⚠ Character.userId 是可空 + ON DELETE SET NULL，**删用户不会删角色**，
        //   留下的角色会变成「孤儿」（userId = null），但 isPublic 仍是 true ——
        //   也就是说被驳回的人导入过的角色会继续挂在成员名册上公开可见。
        //   所以这里显式先删角色，再删账号。
        await tx.character.deleteMany({ where: { userId: targetUserId } });
        // Application 通过外键 ON DELETE CASCADE 一并清除
        await tx.user.delete({ where: { id: targetUserId } });
      }
    });

    // 驳回邮件在事务外发。账号此刻已经删掉了 —— 发信失败也不能回滚，
    // 只能如实把失败原因回报给审批人。
    if (action === "REJECT") {
      if (!(await isMailConfigured())) {
        return NextResponse.json({
          success: true,
          mailSent: false,
          message: "已驳回并注销账号，但邮件服务未配置，未能通知对方。",
        });
      }
      const res = await sendMail({
        to: targetEmail,
        subject: "【Eternal Flame】你的入会申请未通过",
        html: applicationRejectedEmailHtml({
          nickname: targetName,
          applicationCode: appCode,
          reason: trimmedNote || null,
          registerUrl: `${appUrl()}/auth/register`,
        }),
      });
      if (!res.ok) {
        console.error("[applications] 驳回邮件发送失败:", res.error);
        return NextResponse.json({
          success: true,
          mailSent: false,
          message: `已驳回并注销账号，但通知邮件发送失败：${res.error || "未知原因"}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      mailSent: action === "REJECT" ? true : undefined,
      message:
        action === "REJECT"
          ? "已驳回：账号已注销、邮箱已释放，并已邮件通知对方。"
          : "操作成功",
    });
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