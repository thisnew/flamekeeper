import { Metadata } from "next";
import { Image, Video } from "lucide-react";

export const metadata: Metadata = {
  title: "媒体画廊",
  description: "Eternal Flame 公会击杀截图、活动合照与视频集锦。",
};

const PLACEHOLDER_ALBUMS = [
  { name: "击杀截图", count: 0 },
  { name: "活动合照", count: 0 },
  { name: "成就截图", count: 0 },
];

export default function GalleryPage() {
  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Image className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            媒体画廊
          </h1>
          <p className="text-text-secondary">记录我们在艾泽拉斯的每一个高光时刻</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Albums */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {PLACEHOLDER_ALBUMS.map((album) => (
              <div key={album.name} className="bg-bg-card border border-border-default rounded p-6 text-center hover:border-border-gold transition-all cursor-pointer">
                <Image className="w-10 h-10 text-wow-gold mx-auto mb-3" />
                <h3 className="font-bold text-text-primary">{album.name}</h3>
                <p className="text-xs text-text-muted mt-1">{album.count} 张图片</p>
              </div>
            ))}
          </div>

          {/* Empty state */}
          <div className="text-center py-16 border border-border-default rounded bg-bg-card">
            <Video className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-30" />
            <p className="text-text-muted">媒体画廊正在等待第一批勇士的精彩瞬间...</p>
            <p className="text-xs text-text-muted mt-2">官员可以通过后台管理上传图片与视频</p>
          </div>
        </div>
      </section>
    </div>
  );
}