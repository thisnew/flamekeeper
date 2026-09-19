import { Metadata } from "next";
import { MessageCircle, Link2, QrCode, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "联系我们",
  description: "联系 Eternal Flame 公会。KOOK 频道、微信群、官员微信等联系方式。",
};

export default function ContactPage() {
  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <MessageCircle className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            联系我们
          </h1>
          <p className="text-text-secondary">加入 Eternal Flame 的交流社区</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* KOOK */}
            <div className="bg-bg-card border border-border-default rounded p-8 text-center">
              <div className="w-16 h-16 bg-wow-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-8 h-8 text-wow-gold" />
              </div>
              <h3 className="font-display text-lg font-bold text-wow-gold mb-3">KOOK 频道</h3>
              <p className="text-sm text-text-muted mb-4">
                加入我们的 KOOK 频道，参与语音交流、获取最新通知。
              </p>
              <p className="text-sm text-text-muted mb-6">邀请链接：coming soon</p>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-sm text-wow-gold hover:underline"
              >
                加入 KOOK <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* WeChat */}
            <div className="bg-bg-card border border-border-default rounded p-8 text-center">
              <div className="w-16 h-16 bg-wow-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-wow-gold" />
              </div>
              <h3 className="font-display text-lg font-bold text-wow-gold mb-3">微信群</h3>
              <p className="text-sm text-text-muted mb-4">
                加入公会微信群，与成员日常交流、水群聊天。
              </p>
              <p className="text-sm text-text-muted mb-6">
                微信群二维码将在此处展示（入会后可见）
              </p>
              <p className="text-xs text-text-muted">
                或联系官员微信邀请入群
              </p>
            </div>
          </div>

          {/* Register CTA */}
          <div className="mt-12 text-center">
            <p className="text-text-muted mb-4">
              还没有账号？注册并提交入会申请，审批通过后即可加入 KOOK 和微信群。
            </p>
            <a
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-all"
            >
              现在注册
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}