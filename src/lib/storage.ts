import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";

function getUploadsDir(): string {
  const dir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export async function saveFile(
  buffer: Buffer,
  filename: string,
  subfolder = "receipts"
): Promise<{ key: string; url: string }> {
  const dir = path.join(getUploadsDir(), subfolder);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const key = `${subfolder}/${filename}`;
  await fs.writeFile(path.join(getUploadsDir(), key), buffer);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { key, url: `${baseUrl}/uploads/${key}` };
}

export async function deleteFile(key: string): Promise<void> {
  const filePath = path.join(getUploadsDir(), key);
  try {
    await fs.unlink(filePath);
  } catch {
    // file may already be gone
  }
}
