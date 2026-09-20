import type { Metadata } from "next";
import "@/styles/globals.css";
import Providers from "@/components/providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SceneBackground from "@/components/layout/SceneBackground";
import { auth } from "@/lib/auth";
import { appUrlObject } from "@/lib/app-url";

export const metadata: Metadata = {
  title: {
    default: "Eternal Flame | 守焰者 - 薪火不灭，荣耀永燃",
    template: "%s | Eternal Flame · 守焰者",
  },
  description: "Eternal Flame 公会官方网站。薪火不灭，荣耀永燃。魔兽世界公会招募、团本进度、数据分析、插件攻略，尽在守焰者。",
  keywords: ["魔兽世界", "公会", "Eternal Flame", "守焰者", "WOW", "招募", "插件"],
  metadataBase: appUrlObject(),
  openGraph: {
    type: "website",
    siteName: "Eternal Flame | 守焰者",
    title: "Eternal Flame | 守焰者 - 薪火不灭，荣耀永燃",
    description: "Eternal Flame 公会官方网站 · 薪火不灭，荣耀永燃",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch session server-side so Header renders correct auth UI in SSR
  const session = await auth();
  const sessionUser = session?.user
    ? {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role,
        status: (session.user as any).status,
      }
    : null;

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col bg-bg-primary">
        <Providers>
          <SceneBackground />
          <Header user={sessionUser} />
          <main className="flex-1 relative z-10 page-enter">{children}</main>
          <Footer user={sessionUser} />
        </Providers>
      </body>
    </html>
  );
}