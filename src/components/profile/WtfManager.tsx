"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  WTF_ALLOWED_EXTENSIONS,
  WTF_MAX_ACCOUNTS,
  WTF_MAX_CHARACTERS,
  parseWtfFiles,
  type ParsedWtf,
} from "@/lib/wtf";

export type ExistingAccount = { accountName: string; realmCount: number };
export type ExistingCharacter = {
  id: string;
  name: string;
  server: string;
  accountName: string | null;
  sortOrder: number;
};

type PickedFile = { relativePath: string; size: number };

export default function WtfManager({
  accounts,
  characters,
}: {
  accounts: ExistingAccount[];
  characters: ExistingCharacter[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedWtf | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set()); // "realm/name"

  // 已存在的角色（防止重复勾选）
  const existingKeys = useMemo(
    () => new Set(characters.map((c) => `${c.server}/${c.name}`)),
    [characters]
  );

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // 前端先过滤：>1000KB 与非法扩展名都在 parseWtfFiles 里静默跳过
    const pickedFiles: PickedFile[] = files.map((f) => ({
      relativePath: (f as any).webkitRelativePath || f.name,
      size: f.size,
    }));

    const result = parseWtfFiles(pickedFiles);
    setParsed(result);

    if (result.accounts.length === 0) {
      toast.error("没有解析出任何账号，请确认选择的是 WTF 里的 Account（或账号）目录");
      setPicked(new Set());
      return;
    }

    // 默认全选（已在库中的除外）
    const all = new Set<string>();
    for (const a of result.accounts) {
      for (const c of a.characters) {
        const key = `${c.realm}/${c.name}`;
        if (!existingKeys.has(key)) all.add(key);
      }
    }
    setPicked(all);
    toast.success(`解析出 ${result.accounts.length} 个账号`);
  }

  function toggle(key: string) {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setPicked(next);
  }

  const selectedCount = picked.size;
  const wouldExceed =
    characters.length + selectedCount > WTF_MAX_CHARACTERS;

  async function doImport() {
    if (!parsed) return;
    const payload = parsed.accounts
      .map((a) => ({
        accountName: a.accountName,
        characters: a.characters.filter((c) => picked.has(`${c.realm}/${c.name}`)),
      }))
      .filter((a) => a.characters.length > 0);

    if (payload.length === 0) {
      toast.error("请至少勾选一个角色");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/profile/wtf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "导入失败");
        return;
      }
      toast.success(data.message || "导入完成");
      setParsed(null);
      setPicked(new Set());
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(accountName: string) {
    if (!confirm(`移除账号 ${accountName} 及其名下的所有角色？`)) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/profile/wtf?accountName=${encodeURIComponent(accountName)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "删除失败");
        return;
      }
      toast.success(data.message || "已移除");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  }

  async function removeCharacter(id: string, name: string) {
    if (!confirm(`删除角色 ${name}？`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/profile/characters?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "删除失败");
        return;
      }
      toast.success(data.message || "已删除");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...characters];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      const res = await fetch("/api/profile/characters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "排序失败");
        return;
      }
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ---- 说明 ---- */}
      <div className="text-xs text-text-muted leading-relaxed border border-border-default rounded bg-bg-card px-4 py-3">
        <p className="mb-1">
          浏览器<strong className="text-text-secondary">无法直接读取</strong>本地路径
          （安全限制），所以需要你手动选择目录。请选择游戏目录下的
          <code className="mx-1 text-wow-gold">WTF\Account\&lt;你的账号&gt;</code>
          （例如 <code className="text-wow-gold">…\_retail_\WTF\Account\NZY900202</code>）。
        </p>
        <p>
          只会读取其中的<strong className="text-text-secondary">文件夹名</strong>来识别
          账号 / 服务器 / 角色，<strong className="text-text-secondary">不会上传任何文件内容</strong>。
          单个文件超过 1000&nbsp;KB 自动跳过；仅接受 {WTF_ALLOWED_EXTENSIONS.join(" / ")}。
        </p>
      </div>

      {/* ---- 选择目录 ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          // React 没有 webkitdirectory 的类型定义，用展开透传
          {...({ webkitdirectory: "", directory: "" } as any)}
          onChange={onPickFiles}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
        >
          <FolderOpen className="w-4 h-4" />
          选择 WTF 账号目录
        </button>
        <span className="text-xs text-text-muted">
          已用账号 {accounts.length}/{WTF_MAX_ACCOUNTS} · 角色 {characters.length}/
          {WTF_MAX_CHARACTERS}
        </span>
      </div>

      {/* ---- 解析结果 ---- */}
      {parsed && (
        <div className="border border-border-gold rounded bg-bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-text-primary font-semibold">
              解析到 {parsed.accounts.length} 个账号，勾选要导入的角色
            </p>
            <p className="text-xs text-text-muted">
              共 {parsed.totalFiles} 个文件
              {parsed.skipped.tooLarge > 0 && ` · 跳过超大 ${parsed.skipped.tooLarge}`}
              {parsed.skipped.badExtension > 0 && ` · 跳过非白名单 ${parsed.skipped.badExtension}`}
            </p>
          </div>

          {parsed.accounts.map((a) => (
            <div key={a.accountName} className="border-t border-border-default pt-3">
              <p className="text-sm text-wow-gold font-mono mb-2">
                {a.accountName}
                <span className="text-xs text-text-muted ml-2 font-sans">
                  {a.realms.join("、")}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {a.characters.map((c) => {
                  const key = `${c.realm}/${c.name}`;
                  const already = existingKeys.has(key);
                  const on = picked.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={already}
                      onClick={() => toggle(key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${
                        already
                          ? "border-border-default text-text-muted opacity-50 cursor-not-allowed"
                          : on
                            ? "border-wow-gold bg-wow-gold/10 text-wow-gold"
                            : "border-border-default text-text-secondary hover:border-border-gold"
                      }`}
                      title={already ? "已在你的角色列表中" : c.realm}
                    >
                      {on && <Check className="w-3 h-3" />}
                      {c.name}
                      <span className="text-text-muted">{c.realm}</span>
                      {already && <span className="text-text-muted">（已有）</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={doImport}
              disabled={busy || selectedCount === 0 || wouldExceed}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              导入选中的 {selectedCount} 个角色
            </button>
            <button
              type="button"
              onClick={() => {
                setParsed(null);
                setPicked(new Set());
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              取消
            </button>
            {wouldExceed && (
              <span className="inline-flex items-center gap-1 text-xs text-wow-red">
                <AlertCircle className="w-3.5 h-3.5" />
                会超过 {WTF_MAX_CHARACTERS} 个角色上限，请少选一些
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---- 已保存的 WTF 账号 ---- */}
      {accounts.length > 0 && (
        <div className="border border-border-default rounded bg-bg-card p-4">
          <p className="text-sm text-text-primary font-semibold mb-2">已保存的 WTF 账号</p>
          <ul className="space-y-1.5">
            {accounts.map((a) => (
              <li key={a.accountName} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-text-secondary">{a.accountName}</span>
                <span className="text-xs text-text-muted">{a.realmCount} 个服务器</span>
                <button
                  type="button"
                  onClick={() => removeAccount(a.accountName)}
                  disabled={busy}
                  className="ml-auto text-text-muted hover:text-wow-red transition-colors disabled:opacity-50"
                  title="移除该账号及其角色"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- 角色列表 + 排序 ---- */}
      <div className="border border-border-default rounded bg-bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-text-primary font-semibold">
            我的角色
            <span className="text-xs text-text-muted ml-2 font-normal">
              {characters.length}/{WTF_MAX_CHARACTERS} · 上面的排在前
            </span>
          </p>
        </div>

        {characters.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">
            还没有角色。选择 WTF 账号目录即可导入。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {characters.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center gap-3 text-sm border border-border-default rounded px-3 py-2"
              >
                <span className="text-xs text-text-muted w-5">{i + 1}</span>
                <span className="text-text-primary">{c.name}</span>
                <span className="text-xs text-text-muted">{c.server}</span>
                {c.accountName && (
                  <span className="text-xs text-text-muted font-mono">
                    {c.accountName}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    className="text-text-muted hover:text-wow-gold disabled:opacity-30"
                    title="上移"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={busy || i === characters.length - 1}
                    className="text-text-muted hover:text-wow-gold disabled:opacity-30"
                    title="下移"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCharacter(c.id, c.name)}
                    disabled={busy}
                    className="text-text-muted hover:text-wow-red ml-1 disabled:opacity-30"
                    title="删除角色"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
