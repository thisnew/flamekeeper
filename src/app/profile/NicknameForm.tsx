"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";

/**
 * 昵称（显示名）编辑。
 *
 * 保存成功后做两件事：
 *   1. `router.refresh()` —— 本页是服务端组件，重新渲染会重查数据库
 *   2. `update()` —— 刷新会话。页头用的是会话里的 `session.user.name`，
 *      不刷新的话改完昵称页头还是旧名字。
 *      （`jwtCallback` 每次会话都会从库里重读 name，所以这一步真的会生效）
 */
export default function NicknameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [busy, setBusy] = useState(false);

  function cancel() {
    setValue(initialName);
    setEditing(false);
  }

  async function save() {
    const name = value.trim();
    if (name === initialName.trim()) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "保存失败");
        return;
      }
      toast.success(d.message || "昵称已更新");
      setEditing(false);
      // 会话里缓存的是旧昵称（页头用），必须刷新
      await update();
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-lg text-text-primary">{initialName || "未设置昵称"}</h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-text-muted hover:text-wow-gold transition-colors"
          title="修改昵称"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={20}
        autoFocus
        placeholder="2-20 个字符"
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        className="px-3 py-1.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none w-44"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="p-1.5 text-wow-green hover:text-wow-green-bright disabled:opacity-50"
        title="保存"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="p-1.5 text-text-muted hover:text-wow-red disabled:opacity-50"
        title="取消"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
