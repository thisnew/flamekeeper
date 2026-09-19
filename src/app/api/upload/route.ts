import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole } from "@/lib/roles";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// Only allow reasonably safe, guild-relevant file types.
// (Blocks .html/.svg/.js/.exe etc. which could be XSS/RCE vectors when served.)
const ALLOWED_EXT = new Set([
  "zip", "rar", "7z", "tar", "gz",
  "txt", "md", "json", "lua", "xml", "csv", "log", "wa",
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "tga",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
]);

function safeExt(name: string): string | null {
  const ext = (path.extname(name).replace(".", "") || "").toLowerCase();
  if (!ext) return null;
  return ALLOWED_EXT.has(ext) ? ext : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (!isMemberOrAboveRole(user.role)) {
      return NextResponse.json(
        { error: "仅审批通过的公会成员可以上传文件" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "文件为空" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `文件过大（${mb}MB），上限 10MB` },
        { status: 413 }
      );
    }

    const ext = safeExt(file.name);
    if (!ext) {
      return NextResponse.json(
        { error: "不支持的文件类型。允许：zip/rar/7z、txt/md/json/lua/xml/csv、图片、pdf、office 文档" },
        { status: 415 }
      );
    }

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });

    const stored = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, stored), buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${stored}`,
      name: file.name.slice(0, 200),
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "上传失败，请稍后再试" }, { status: 500 });
  }
}