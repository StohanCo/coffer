import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { path: segments = [] } = await params;
  const relativePath = segments.join("/");
  if (relativePath.includes("..")) return new NextResponse("Forbidden", { status: 403 });

  const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsDir, relativePath);

  if (!existsSync(filePath)) return new NextResponse("Not found", { status: 404 });

  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" }[ext] ??
    "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
