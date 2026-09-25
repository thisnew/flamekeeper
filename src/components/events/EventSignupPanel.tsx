"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Download, Loader2, MapPin, UserCheck, Users } from "lucide-react";
import toast from "react-hot-toast";

import { displayName } from "@/lib/privacy";
export type SignupRow = {
  id: string;
  userId: string;
  status: string;
  attendance: string | null;
  note: string | null;
  user: { id: string; name: string | null; email: string };
};

export type EventView = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  /** 展示用文本，由服务端按 DISPLAY_TIMEZONE 格式化后传入 —— 避免时区差异导致 hydration mismatch */
  startLabel: string;
  endLabel: string;
  /** 原始 ISO，仅用于「是否已结束」的比较，不参与渲染 */
  endTimeIso: string;
  maxSlots: number | null;
  location: string | null;
  signups: SignupRow[];
};

const TYPE_LABELS: Record<string, string> = {
  RAID: "团本",
  MPLUS: "大秘境",
  PVP: "PVP",
  SOCIAL: "聚会",
  OTHER: "其他",
};

const ATTENDANCE_LABELS: Record<string, string> = {
  ATTENDED: "已出席",
  ABSENT: "缺席",
  LEAVE: "已请假",
};

const ATTENDANCE_STYLES: Record<string, string> = {
  ATTENDED: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  ABSENT: "text-wow-red border-wow-red/40 bg-wow-red/10",
  LEAVE: "text-amber-400 border-amber-500/40 bg-amber-500/10",
};

export default function EventSignupPanel({
  event,
  currentUserId,
  isOfficer,
}: {
  event: EventView;
  currentUserId: string;
  isOfficer: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const confirmed = event.signups.filter((s) => s.status === "CONFIRMED");
  const bench = event.signups.filter((s) => s.status === "BENCH");
  const mine = event.signups.find((s) => s.userId === currentUserId);
  const myActive = mine && mine.status !== "CANCELLED" ? mine : null;

  const ended = new Date(event.endTimeIso).getTime() < Date.now();
  const full = event.maxSlots != null && confirmed.length >= event.maxSlots;

  // 替补排位 = 比我早报名的替补人数 + 1
  const myBenchPosition =
    myActive?.status === "BENCH"
      ? bench.findIndex((s) => s.id === myActive.id) + 1
      : null;

  async function call(url: string, init: RequestInit, okMsg: string) {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "操作失败");
        return null;
      }
      toast.success(data.message || okMsg);
      router.refresh();
      return data;
    } catch {
      toast.error("网络错误，请稍后再试");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const signUp = () =>
    call(
      "/api/events/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, note }),
      },
      "报名成功"
    ).then((d) => {
      if (d) setNote("");
    });

  const cancel = () =>
    call(
      `/api/events/signup?eventId=${encodeURIComponent(event.id)}`,
      { method: "DELETE" },
      "已取消报名"
    );

  const officerUpdate = (signupId: string, patch: Record<string, unknown>) =>
    call(
      "/api/events/signup",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId, ...patch }),
      },
      "已更新"
    );

  return (
    <div className="bg-bg-card border border-border-default rounded p-6 hover:border-border-gold transition-all">
      {/* ---- 头部 ---- */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
              {TYPE_LABELS[event.eventType] || event.eventType}
            </span>
            {ended && (
              <span className="text-xs px-2 py-0.5 text-text-muted border border-border-default rounded">
                已结束
              </span>
            )}
            {!ended && full && (
              <span className="text-xs px-2 py-0.5 text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded">
                名额已满
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-text-primary">{event.title}</h3>
        </div>

        {isOfficer && (
          <a
            href={`/api/events/export?eventId=${encodeURIComponent(event.id)}`}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border-default text-text-secondary rounded hover:border-wow-gold hover:text-wow-gold transition-colors"
            title="导出名单 CSV"
          >
            <Download className="w-3.5 h-3.5" /> 导出
          </a>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-text-secondary whitespace-pre-line mb-3">
          {event.description}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 text-sm text-text-muted mb-4">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {event.startLabel} - {event.endLabel}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {confirmed.length}
          {event.maxSlots ? `/${event.maxSlots}` : ""} 人
          {bench.length > 0 && ` · 替补 ${bench.length}`}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </span>
        )}
      </div>

      {/* ---- 我的状态 / 报名按钮 ---- */}
      <div className="border-t border-border-default pt-4">
        {myActive ? (
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded border ${
                myActive.status === "CONFIRMED"
                  ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                  : "text-amber-400 border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {myActive.status === "CONFIRMED"
                ? "你是正式成员"
                : `替补中${myBenchPosition ? `（第 ${myBenchPosition} 位）` : ""}`}
            </span>
            {myActive.note && (
              <span className="text-xs text-text-muted">备注：{myActive.note}</span>
            )}
            {!ended && (
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="ml-auto px-3 py-1.5 text-xs border border-border-default text-text-secondary rounded hover:border-wow-red hover:text-wow-red transition-colors disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "取消报名"}
              </button>
            )}
          </div>
        ) : (
          !ended && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="备注（可选，如：想打治疗）"
                className="flex-1 min-w-[10rem] px-3 py-1.5 text-sm bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
              />
              <button
                type="button"
                onClick={signUp}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold bg-wow-gold text-black rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                {full ? "报名替补" : "报名"}
              </button>
            </div>
          )
        )}
        {ended && !myActive && (
          <p className="text-xs text-text-muted">活动已结束，报名通道已关闭。</p>
        )}
      </div>

      {/* ---- 名单 ---- */}
      {event.signups.filter((s) => s.status !== "CANCELLED").length > 0 && (
        <div className="mt-4 space-y-3">
          {[
            { label: "正式名单", rows: confirmed, tone: "text-emerald-400" },
            { label: "替补队列", rows: bench, tone: "text-amber-400" },
          ]
            .filter((g) => g.rows.length > 0)
            .map((group) => (
              <div key={group.label}>
                <p className={`text-xs mb-1.5 ${group.tone}`}>
                  {group.label}（{group.rows.length}）
                </p>
                <ul className="space-y-1">
                  {group.rows.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-2 text-sm text-text-secondary py-1 border-b border-border-default/50 last:border-0"
                    >
                      <span className="text-text-muted text-xs w-5">
                        {group.label === "替补队列" ? `${i + 1}.` : ""}
                      </span>
                      <span>{displayName(s.user)}</span>
                      {s.userId === currentUserId && (
                        <span className="text-xs text-wow-gold">（我）</span>
                      )}
                      {s.note && (
                        <span className="text-xs text-text-muted truncate max-w-[16rem]">
                          {s.note}
                        </span>
                      )}

                      {s.attendance && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            ATTENDANCE_STYLES[s.attendance] ?? ""
                          }`}
                        >
                          {ATTENDANCE_LABELS[s.attendance] ?? s.attendance}
                        </span>
                      )}

                      {isOfficer && (
                        <span className="ml-auto flex items-center gap-1.5">
                          <select
                            value={s.status}
                            disabled={busy}
                            onChange={(e) =>
                              officerUpdate(s.id, { status: e.target.value })
                            }
                            className="text-xs bg-bg-secondary border border-border-default rounded px-1.5 py-1 text-text-secondary focus:border-wow-gold focus:outline-none"
                            title="报名状态"
                          >
                            <option value="CONFIRMED">正式</option>
                            <option value="BENCH">替补</option>
                            <option value="CANCELLED">取消</option>
                          </select>
                          <select
                            value={s.attendance ?? ""}
                            disabled={busy}
                            onChange={(e) =>
                              officerUpdate(s.id, {
                                attendance: e.target.value || null,
                              })
                            }
                            className="text-xs bg-bg-secondary border border-border-default rounded px-1.5 py-1 text-text-secondary focus:border-wow-gold focus:outline-none"
                            title="出勤"
                          >
                            <option value="">未标记</option>
                            <option value="ATTENDED">已出席</option>
                            <option value="ABSENT">缺席</option>
                            <option value="LEAVE">已请假</option>
                          </select>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
