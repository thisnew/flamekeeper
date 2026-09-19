import Link from "next/link";
import { Flame } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Flame className="w-16 h-16 text-wow-orange mx-auto mb-6 animate-pulse-gold" />
        <h1 className="font-display text-4xl font-black text-wow-gold text-glow mb-3">404</h1>
        <p className="text-text-secondary mb-2">这个页面似乎被虚空吞噬了...</p>
        <p className="text-sm text-text-muted mb-8">
          也许你迷路了？艾泽拉斯的道路总是充满未知。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-all"
        >
          <Flame className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}