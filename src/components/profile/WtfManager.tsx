"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Download,
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
  isMain?: boolean;
  /** 有值 = 是公会成员（可设主力、进公会名单） */
  guildMemberId?: string | null;
};

type PickedFile = { relativePath: string; size: number };

/** 人类可读的字节数。 */
function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function WtfManager({
  accounts,
  characters,
  fileCount = 0,
  totalBytes = 0,
}: {
  accounts: ExistingAccount[];
  characters: ExistingCharacter[];
  fileCount?: number;
  totalBytes?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedWtf | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set()); // "realm/name"
  /** 真正要上传的 File 对象（不是路径）—— 「上传 WTF 内的所有内容」 */
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  /** 被公会名单过滤掉的角色数（严格模式下不展示，只报个数） */
  const [ignoredCount, setIgnoredCount] = useState(0);
  /**
   * 是否把 WTF 文件存到服务器备份。
   *  - true ：走当前流程，文件落盘（可导出恢复）
   *  - false：**仅检索**，一个字节都不传，只从目录名提取角色
   */
  const [backup, setBackup] = useState(true);

  // 已存在的角色（防止重复勾选）
  const existingKeys = useMemo(
    () => new Set(characters.map((c) => `${c.server}/${c.name}`)),
    [characters]
  );

  /** 显式设置 webkitdirectory —— JSX 展开透传在小概率下不生效，这里兜底。 */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
  }, []);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // 注意：优先用 webkitRelativePath（含目录层级）；为空说明浏览器没给目录结构
    const pickedFiles: PickedFile[] = files.map((f) => ({
      relativePath: (f as any).webkitRelativePath || "",
      size: f.size,
    }));

    const result = parseWtfFiles(pickedFiles);
    setParsed(result);
    if (result.accounts.length === 0) {
      // 报错要能定位问题，而不是只说「没解析出来」
      const s = result.skipped;
      const parts: string[] = [`共 ${result.totalFiles} 个文件`];
      if (s.noDirectoryInfo > 0) parts.push(`其中 ${s.noDirectoryInfo} 个没有目录信息`);
      if (s.badExtension > 0) parts.push(`${s.badExtension} 个扩展名不符`);
      if (s.tooLarge > 0) parts.push(`${s.tooLarge} 个超过 1000KB`);
      if (s.unrecognizedPath > 0) parts.push(`${s.unrecognizedPath} 个层级识别失败`);

      const sample = result.samplePaths[0];

      if (s.noDirectoryInfo === result.totalFiles) {
        toast.error(
          "浏览器没有提供目录结构，无法识别账号。请改用 Chrome / Edge 重新选择目录。",
          { duration: 8000 }
        );
      } else {
        toast.error(
          `没有解析出账号（${parts.join("，")}）。${
            sample ? `示例路径：${sample}` : ""
          }`,
          { duration: 8000 }
        );
      }
      setPicked(new Set());
      return;
    }

    // ★ 与公会名单比对（严格模式）：只保留公会成员，
    //   非公会角色**不展示、不上传**。服务器中英对齐依赖服务端的服务器字典，
    //   所以这一步必须走接口，不能在前端判断。
    let guildKeys: Set<string> = new Set();
    try {
      const allChars = result.accounts.flatMap((a) =>
        a.characters.map((c) => ({ realm: c.realm, name: c.name }))
      );
      if (allChars.length > 0) {
        const res = await fetch("/api/guild/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characters: allChars }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(d.guildKeys)) {
          guildKeys = new Set<string>(d.guildKeys);
        } else if (!res.ok) {
          toast.error(d.error || "公会名单比对失败", { duration: 8000 });
          return;
        }
      }
    } catch {
      toast.error("公会名单比对失败（网络错误）", { duration: 8000 });
      return;
    }

    // 过滤成「只有公会成员」的结果
    const guildOnly: ParsedWtf = {
      ...result,
      accounts: result.accounts
        .map((a) => ({
          ...a,
          characters: a.characters.filter((c) => guildKeys.has(`${c.realm}/${c.name}`)),
        }))
        .filter((a) => a.characters.length > 0),
    };
    const totalParsed = result.accounts.reduce((s, a) => s + a.characters.length, 0);
    const guildCount = guildOnly.accounts.reduce((s, a) => s + a.characters.length, 0);
    const ignored = totalParsed - guildCount;

    setParsed(guildOnly);
    setIgnoredCount(ignored);

    if (guildOnly.accounts.length === 0) {
      toast.error(
        `解析出 ${totalParsed} 个角色，但**没有一个是本公会成员**，无法导入。` +
          "请确认这些角色的服务器与角色名能在公会名单里找到；" +
          "若名单尚未导入，请管理员到「后台 → 公会数据更新 → 公会成员名单」先导入。",
        { duration: 12000 }
      );
      setPickedFiles([]);
      setPicked(new Set());
      return;
    }

    // 默认全选（已在库中的除外）
    const all = new Set<string>();
    for (const a of guildOnly.accounts) {
      for (const c of a.characters) {
        const key = `${c.realm}/${c.name}`;
        if (!existingKeys.has(key)) all.add(key);
      }
    }
    setPicked(all);

    // 只保留「被选中的公会角色」名下的文件（服务端还会再验一次）
    const allowedCharKeys = new Set<string>();
    const allowedAccounts = new Set<string>();
    for (const a of guildOnly.accounts) {
      for (const c of a.characters) {
        allowedCharKeys.add(`${a.accountName}/${c.realm}/${c.name}`);
        allowedAccounts.add(a.accountName);
      }
    }

    const uploadable = files.filter((f) => {
      const rel = ((f as any).webkitRelativePath || "").replace(/\\/g, "/");
      const name = rel.split("/").pop() || f.name || "";
      const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
      if (!(["txt", "md5", "lua", "bak", "old", "wtf"] as string[]).includes(ext)) return false;
      if (f.size > 1000 * 1024) return false;

      // 路径形如 <前缀>/Account/<账号>/<服务器>/<角色>/…；只保留命中公会角色的
      const parts = rel.split("/").filter(Boolean);
      const accIdx = parts.findIndex((p: string) => p.toLowerCase() === "account");
      const base = accIdx === -1 ? 0 : accIdx + 1;
      if (parts.length < base + 4) return false;
      const account = parts[base];
      if (!allowedAccounts.has(account)) return false;
      return allowedCharKeys.has(`${account}/${parts[base + 1]}/${parts[base + 2]}`);
    });
    setPickedFiles(uploadable);

    toast.success(
      `公会名单命中 ${guildCount} 个角色` +
        (ignored > 0 ? `（另有 ${ignored} 个非公会角色已忽略）` : "") +
        `，将上传 ${uploadable.length} 个文件`,
      { duration: 6000 }
    );
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

    // 勾选的角色 → 用于建档
    const selectedChars = parsed.accounts.flatMap((a) =>
      a.characters
        .filter((c) => picked.has(`${c.realm}/${c.name}`))
        .map((c) => ({ accountName: a.accountName, realm: c.realm, name: c.name }))
    );

    if (selectedChars.length === 0) {
      toast.error("请至少勾选一个角色");
      return;
    }
    if (backup && pickedFiles.length === 0) {
      toast.error("没有可上传的文件（可能全部超过 1000KB 或扩展名不符）");
      return;
    }

    setBusy(true);
    try {
      let res: Response;
      if (backup) {
        // ① 备份模式：把文件内容传上去，存为个人配置文件
        const form = new FormData();
        for (const f of pickedFiles)
          form.append("files", f, (f as any).webkitRelativePath || f.name);
        form.append("characters", JSON.stringify(selectedChars));
        // 注意：不要手动设 Content-Type，浏览器要自己带 multipart boundary
        res = await fetch("/api/profile/wtf", { method: "POST", body: form });
      } else {
        // ② 仅检索模式：**一个字节的文件都不传**，只交角色清单。
        //    提取角色本来只需要目录名，把几十 MB 推上去再删纯属浪费。
        res = await fetch("/api/profile/wtf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characters: selectedChars }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "导入失败", { duration: 8000 });
        return;
      }
      toast.success(data.message || "导入完成");
      setParsed(null);
      setPicked(new Set());
      setPickedFiles([]);
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

  /** 设为主力（每人唯一）。传空表示取消。 */
  async function setMain(id: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/profile/characters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainId: id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "设置失败");
        return;
      }
      toast.success(d.message || "已设为主力");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  }

  const guildCount = characters.filter((c) => c.guildMemberId).length;
  /** 当前主力（每位成员**至多一个**，服务端在事务里保证） */
  const currentMain = characters.find((c) => c.isMain) ?? null;
  /** 可设为主力的候选：公会名单里的角色（非公会角色没资格当主力） */
  const mainCandidates = characters.filter((c) => c.guildMemberId);

  return (
    <div className="space-y-4">
      {/* ---- 说明 ---- */}
      <div className="text-xs text-text-muted leading-relaxed border border-border-default rounded bg-bg-card px-4 py-3">
        <p className="mb-2">
          浏览器<strong className="text-text-secondary">无法直接读取</strong>本地路径
          （安全限制），所以要你手动选目录。<strong className="text-text-secondary">下面三层任选其一</strong>都可以：
        </p>
        <ul className="space-y-1 mb-2 list-disc pl-5">
          <li>
            <code className="text-wow-gold">…\_retail_\WTF</code>（推荐，最省事）
          </li>
          <li>
            <code className="text-wow-gold">…\_retail_\WTF\Account</code>
          </li>
          <li>
            <code className="text-wow-gold">…\WTF\Account\NZY900202</code>（你的账号目录）
          </li>
        </ul>
        <p>
          只会读取其中的<strong className="text-text-secondary">文件夹名</strong>来识别
          账号 / 服务器 / 角色，<strong className="text-text-secondary">不会上传任何文件内容</strong>。
          单个文件超过 1000&nbsp;KB 自动跳过；仅接受 {WTF_ALLOWED_EXTENSIONS.join(" / ")}。
          请使用 <strong className="text-text-secondary">Chrome / Edge</strong> ——
          其它浏览器可能不提供目录结构。
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
          {fileCount > 0 && ` · 已存 ${fileCount} 个文件 (${formatBytes(totalBytes)})`}
        </span>

        {fileCount > 0 && (
          <a
            href="/api/profile/wtf/download"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border-default text-text-secondary rounded hover:border-wow-gold hover:text-wow-gold transition-colors"
            title="把已保存的 WTF 文件打包下载"
          >
            <Download className="w-4 h-4" />
            导出 zip
          </a>
        )}
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

          <div className="pt-2 border-t border-border-default space-y-3">
            {/* ★ 是否备份文件到服务器 */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={backup}
                onChange={(e) => setBackup(e.target.checked)}
                disabled={busy}
                className="mt-0.5 accent-wow-gold"
              />
              <span className="text-xs leading-relaxed">
                <span className="text-text-secondary font-medium">
                  同时把 WTF 文件备份到服务器
                </span>
                <span className="text-text-muted">
                  （{pickedFiles.length} 个文件，约{" "}
                  {Math.max(1, Math.round(
                    pickedFiles.reduce((s, f) => s + f.size, 0) / 1024
                  ))}{" "}
                  KB）
                </span>
                <br />
                <span className="text-text-muted">
                  {backup ? (
                    <>
                      <strong className="text-text-secondary">勾选</strong>
                      ：走当前流程，文件存进你自己的私有空间，
                      之后可以在下面下载 / 导出 zip 恢复插件配置。
                    </>
                  ) : (
                    <>
                      <strong className="text-text-secondary">不勾选</strong>
                      ：<strong className="text-wow-gold">仅检索</strong>
                      ——一个字节都不上传，只从目录名提取角色并比对公会名单。
                      适合你只是想把角色登记进名册、不需要备份插件配置的情况。
                    </>
                  )}
                </span>
              </span>
            </label>

            <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={doImport}
              disabled={busy || selectedCount === 0 || wouldExceed}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {backup
                ? `导入并备份 ${selectedCount} 个角色`
                : `仅导入 ${selectedCount} 个角色（不备份）`}
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
          {currentMain && (
            <span className="text-xs px-2 py-0.5 rounded border text-wow-gold border-wow-gold/40 bg-wow-gold/10">
              ★ 主力：{currentMain.name}
            </span>
          )}
        </div>

        {characters.length > 0 && (
          <p className="text-xs text-text-muted mb-3 leading-relaxed">
            {mainCandidates.length === 0 ? (
              <>
                这些角色<strong className="text-text-secondary">都不在公会名单中</strong>
                ，暂时无法指定主力。
              </>
            ) : currentMain ? (
              <>
                <strong className="text-text-secondary">每位成员只能有一个主力</strong>
                —— 换一个会自动取消原来的。想改点角色右侧的「设为主力」。
              </>
            ) : (
              <>
                <strong className="text-text-secondary">还没指定主力</strong>
                —— 每位成员只能有一个，点角色右侧的「设为主力」选择。
              </>
            )}
          </p>
        )}

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
                {/* 公会成员标记 —— 只有名单里的角色能设主力、进公会名单 */}
                {c.guildMemberId ? (
                  c.isMain ? (
                    <span className="text-xs px-1.5 py-0.5 rounded border text-wow-gold border-wow-gold/40 bg-wow-gold/10">
                      ★ 主力
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-400">公会成员</span>
                  )
                ) : (
                  <span className="text-xs text-text-muted">非公会名单</span>
                )}
                <span className="ml-auto flex items-center gap-1">
                  {c.guildMemberId && !c.isMain && (
                    <button
                      type="button"
                      onClick={() => setMain(c.id)}
                      disabled={busy}
                      className="text-xs px-2 py-1 border border-border-default rounded text-text-muted hover:border-wow-gold hover:text-wow-gold transition-colors disabled:opacity-50"
                      title="设为主力（会取消当前主力）"
                    >
                      设为主力
                    </button>
                  )}
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
