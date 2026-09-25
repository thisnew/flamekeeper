"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  applicationCode: string;
  status: string;
  officerNote: string | null;
  createdAt: string | Date;
  user: {
    email: string;
    name: string | null;
    status: string;
    emailVerified: string | Date | null;
    referredBy: { id: string; name: string | null; email: string } | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待审批", color: "text-wow-gold" },
  APPROVED: { label: "已通过", color: "text-wow-green" },
  REJECTED: { label: "已拒绝", color: "text-wow-red" },
  NEEDS_INFO: { label: "需补充信息", color: "text-wow-orange" },
};

export default function ApplicationsClient({
  initial,
  canDelete = false,
}: {
  initial: Application[];
  canDelete?: boolean;
}) {
  const [list, setList] = useState<Application[]>(initial);
  const [acting, setActing] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const handleAction = async (id: string, action: "APPROVE" | "REJECT" | "NEEDS_INFO") => {
    setActing(id);
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: id, action, note: noteInputs[id] || "" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("操作成功");
        setList((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "NEEDS_INFO", officerNote: noteInputs[id] || null }
              : a
          )
        );
      } else {
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除「${name}」的申请记录？此操作不可恢复。`)) return;
    setActing(id);
    try {
      const res = await fetch(`/api/applications?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("申请已删除");
        setList((prev) => prev.filter((a) => a.id !== id));
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setActing(null);
    }
  };

  if (list.length === 0) {
    return (
      <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
        <p>暂无入会申请</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {list.map((app) => {
        const status = STATUS_LABELS[app.status] || { label: app.status, color: "text-text-muted" };
        const isPending = app.status === "PENDING";
        return (
          <div key={app.id} className="bg-bg-card border border-border-default rounded p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="font-bold text-lg text-text-primary">
                    {app.user.name || "（未设昵称）"}
                  </span>
                  <span className="text-xs text-text-muted">{app.user.email}</span>
                  <span className={`text-sm font-bold ${status.color}`}>● {status.label}</span>
                  {!app.user.emailVerified && (
                    <span className="text-xs px-2 py-0.5 bg-wow-orange/10 text-wow-orange border border-wow-orange/30 rounded">
                      邮箱未验证
                    </span>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(app.id, app.user.name || app.user.email)}
                      disabled={acting === app.id}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs border border-wow-red/30 text-wow-red rounded hover:bg-wow-red/10 transition-colors disabled:opacity-50"
                      title="删除该申请记录"
                    >
                      {acting === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      删除
                    </button>
                  )}
                </div>
                <div className="text-sm text-text-muted space-y-1">
                  {/* 注册只填昵称，不再有角色/职业/装等等游戏信息 */}
                  <p>邮箱：{app.user.email}</p>
                  <p className="text-xs mt-2">申请编号：<code className="text-wow-gold">{app.applicationCode}</code></p>
                  <p className="text-xs">提交时间：{new Date(app.createdAt).toLocaleString("zh-CN")}</p>
                  {app.officerNote && (
                    <p className="text-xs text-wow-orange mt-1">审批备注：{app.officerNote}</p>
                  )}
                  {app.user.referredBy && (
                    <p className="text-xs text-wow-gold mt-1">
                      引荐人：{app.user.referredBy.name || app.user.referredBy.email}
                    </p>
                  )}
                </div>
              </div>

              {isPending && (
                <div className="md:w-72 shrink-0">
                  <textarea
                    rows={2}
                    placeholder="备注（可选）"
                    value={noteInputs[app.id] || ""}
                    onChange={(e) => setNoteInputs({ ...noteInputs, [app.id]: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none resize-none mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAction(app.id, "APPROVE")}
                      disabled={acting === app.id}
                      className={cn("py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors",
                        "bg-wow-green/20 text-wow-green border border-wow-green/40 hover:bg-wow-green/30")}
                    >
                      {acting === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      通过
                    </button>
                    <button
                      onClick={() => handleAction(app.id, "NEEDS_INFO")}
                      disabled={acting === app.id}
                      className={cn("py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors",
                        "bg-wow-orange/20 text-wow-orange border border-wow-orange/40 hover:bg-wow-orange/30")}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      补资料
                    </button>
                    <button
                      onClick={() => handleAction(app.id, "REJECT")}
                      disabled={acting === app.id}
                      className={cn("py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors",
                        "bg-wow-red/20 text-wow-red border border-wow-red/40 hover:bg-wow-red/30")}
                    >
                      <XCircle className="w-3 h-3" />
                      拒绝
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}