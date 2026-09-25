"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Calendar, Clock, ArrowLeft, KeyRound, Loader2, FileCheck, Gamepad2 } from "lucide-react";
import toast from "react-hot-toast";
import { useEffect } from "react";
import WtfManager, {
  type ExistingAccount,
  type ExistingCharacter,
} from "@/components/profile/WtfManager";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const user = session?.user as any;

  const [applications, setApplications] = useState<any[]>([]);
  const [wtfAccounts, setWtfAccounts] = useState<ExistingAccount[]>([]);
  const [wtfCharacters, setWtfCharacters] = useState<ExistingCharacter[]>([]);
  const [wtfFileCount, setWtfFileCount] = useState(0);
  const [wtfTotalBytes, setWtfTotalBytes] = useState(0);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/applications")
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []))
      .catch(() => {});
    fetch("/api/profile/wtf")
      .then((r) => r.json())
      .then((d) => {
        setWtfAccounts(d.accounts || []);
        setWtfCharacters(d.characters || []);
        setWtfFileCount(d.fileCount || 0);
        setWtfTotalBytes(d.totalBytes || 0);
      })
      .catch(() => {});
  }, [user?.id]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-wow-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push("/auth/login");
    return null;
  }

  const roleLabels: Record<string, string> = {
    USER: "注册用户", MEMBER: "公会成员", OFFICER: "官员", ADMIN: "管理员",
  };
  const statusLabels: Record<string, string> = {
    PENDING_EMAIL: "待邮箱验证", PENDING_APPROVAL: "待审批",
    APPROVED: "已通过", REJECTED: "已拒绝", NEEDS_INFO: "需补充信息",
  };

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error("请填写完整");
    if (pwForm.newPassword !== pwForm.confirm) return toast.error("两次新密码不一致");
    if (pwForm.newPassword.length < 6) return toast.error("新密码至少6位");
    setPwBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("密码已更新");
        setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      } else {
        toast.error(data.error || "修改失败");
      }
    } finally {
      setPwBusy(false);
    }
  };

  // ⚠ **已通过的申请不再展示** —— 审批通过后成员没必要再看一遍「已通过」，
  //   完整记录在「后台 → 入会审批」里管理员随时可查。
  //   这里只留需要成员本人关注的状态（待审批 / 需补充信息）。
  const pendingApplications = applications.filter((a) => a.status !== "APPROVED");

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-8">
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>

      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-8">个人中心</h1>

      <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-bg-secondary border border-border-gold flex items-center justify-center">
            <User className="w-8 h-8 text-wow-gold" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary">{user?.name || "未设置昵称"}</h2>
            <p className="text-sm text-text-muted flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-secondary/50 rounded p-4">
            <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
              <Shield className="w-4 h-4" /> 角色
            </div>
            <div className="font-bold text-wow-gold">{roleLabels[user?.role] || user?.role}</div>
          </div>
          <div className="bg-bg-secondary/50 rounded p-4">
            <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
              <Clock className="w-4 h-4" /> 账号状态
            </div>
            <div className="font-bold text-wow-green">{statusLabels[user?.status] || user?.status}</div>
          </div>
          <div className="col-span-2 bg-bg-secondary/50 rounded p-4">
            <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
              <Calendar className="w-4 h-4" /> 用户 ID
            </div>
            <div className="font-mono text-xs text-text-muted break-all">{user?.id}</div>
          </div>
        </div>
      </div>

      {/* 只在有「需要成员关注」的申请时才出现整块；已通过的不占位 */}
      {pendingApplications.length > 0 && (
        <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
          <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-wow-gold" /> 我的入会申请
          </h3>
          <div className="space-y-2">
            {pendingApplications.map((a) => (
              <div key={a.id} className="bg-bg-secondary/50 rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-text-primary">
                      {a.characterName || "入会申请"}
                    </span>
                  </div>
                  <span className={`text-xs ${
                    a.status === "REJECTED" ? "text-wow-red" :
                    a.status === "NEEDS_INFO" ? "text-wow-orange" : "text-wow-gold"
                  }`}>
                    {a.status === "PENDING" ? "待审批" :
                     a.status === "REJECTED" ? "已拒绝" : "需补充信息"}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1">申请编号：<code>{a.applicationCode}</code></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-wow-gold" /> 我的角色
        </h3>
        <WtfManager
          accounts={wtfAccounts}
          characters={wtfCharacters}
          fileCount={wtfFileCount}
          totalBytes={wtfTotalBytes}
        />
      </div>

      <div className="bg-bg-card border border-border-default rounded p-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-wow-gold" /> 修改密码
        </h3>
        <div className="space-y-3 max-w-md">
          <input type="password" placeholder="当前密码" value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <input type="password" placeholder="新密码（至少6位）" value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <input type="password" placeholder="确认新密码" value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <button onClick={changePassword} disabled={pwBusy}
            className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50 flex items-center gap-1">
            {pwBusy && <Loader2 className="w-4 h-4 animate-spin" />}更新密码
          </button>
        </div>
      </div>
    </div>
  );
}