import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "加入我们",
};

export default function ApplyPage() {
  return (
    <div className="page-enter min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-wow-gold mb-4">加入 Eternal Flame</h1>
        <p className="text-text-muted mb-6">
          请前往入会指南页面了解加入流程
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/guide" className="px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors">
            入会指南
          </Link>
          <Link href="/auth/register" className="px-6 py-2.5 border border-border-gold text-wow-gold rounded hover:bg-bg-card transition-colors">
            直接注册
          </Link>
        </div>
      </div>
    </div>
  );
}