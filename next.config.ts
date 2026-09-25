import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/**
 * 找出当前构建对应的 git 版本，供页脚展示。
 *
 * ⚠ 必须**在构建期**确定：
 *   - `.dockerignore` 把 `.git` 排除了，容器里读不到仓库
 *   - 运行时镜像只拷 `.next/standalone`，同样没有 `.git`
 * 所以这里构建时算好，通过 `env` 内联进产物
 * （`NEXT_PUBLIC_*` 会被 Next 在构建时替换成字面量，与 `NEXT_PUBLIC_APP_URL` 同理）。
 *
 * 取值优先级：
 *   1. `GIT_SHA` / `NEXT_PUBLIC_GIT_SHA` —— CI 用 `--build-arg` 传进来（推荐）
 *   2. 本地 `git rev-parse --short HEAD` —— 本机构建能读到 `.git`
 *   3. `"unknown"` —— 都没有时如实显示，不编一个假的
 */
function resolveGitSha(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GIT_SHA || process.env.GIT_SHA;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().slice(0, 12);

  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    // 不是 git 工作区，或环境里没有 git
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  env: {
    /** 页脚显示的版本号，见 resolveGitSha 的注释 */
    NEXT_PUBLIC_GIT_SHA: resolveGitSha(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Run with `npm run dev` which passes `-H 0.0.0.0` to allow LAN access.
  // If WebSocket HMR fails (browser-side only), the app still works;
  // only live-reload during development is affected.
};

export default nextConfig;