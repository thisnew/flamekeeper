import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { listWtfFiles, readWtfFile } from "@/lib/wtf-storage";
import { formatDate } from "@/lib/datetime";

/**
 * 把当前用户已保存的 WTF 文件打包成 zip 下载。
 *
 * 只有本人能下载自己的 —— 文件存在 public/ 之外，没有其它入口。
 * 用 `compression: DEFLATE`：WTF 里大量是文本 lua，压缩收益明显。
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const files = await listWtfFiles(user.id);
    if (files.length === 0) {
      return NextResponse.json({ error: "你还没有上传过 WTF 文件" }, { status: 404 });
    }

    const zip = new JSZip();
    let added = 0;
    for (const f of files) {
      const buf = await readWtfFile(user.id, f.relPath);
      if (!buf) continue;
      // 保留原始目录结构，解压后可直接对照
      zip.file(`WTF/${f.relPath}`, buf);
      added++;
    }

    if (added === 0) {
      return NextResponse.json({ error: "没有可导出的文件" }, { status: 404 });
    }

    const data = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // ⚠ HTTP 头只能是 Latin-1。中文文件名必须放在 filename*（RFC 5987）里，
    //    直接写进 filename= 会让 Response 构造抛 TypeError（CSV 导出踩过这个坑）
    const asciiName = `flamekeeper-wtf-${formatDate(new Date())}.zip`;
    const utf8Name = `守焰者-WTF-${formatDate(new Date())}.zip`;

    return new NextResponse(data as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(
          utf8Name
        )}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[profile/wtf/download] GET:", error);
    return NextResponse.json({ error: "打包失败，请稍后再试" }, { status: 500 });
  }
}
