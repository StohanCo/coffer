import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";
import { saveFile } from "@/lib/storage";
import { ocrImage, isOcrAvailable } from "@/lib/ocr";
import { parseReceiptText } from "@/lib/receipt-parse";
import { nanoid } from "nanoid";
import path from "path";

export const runtime = "nodejs";

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/receipts/scan  (multipart/form-data, field "file")
 *
 * Stores the receipt image and runs on-server OCR to suggest amount/date/merchant.
 * Always returns the stored `url`; OCR fields are best-effort and may be empty.
 */
export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return err("No file uploaded");
  if (file.size > MAX_BYTES) return err("File too large (max 10MB)");

  const ext = path.extname(file.name).toLowerCase() || ".png";
  if (!ALLOWED.has(ext)) return err("Unsupported file type — use JPG, PNG or WebP");

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${session.user.id}-${nanoid(10)}${ext}`;

  const { url } = await saveFile(buffer, filename, "receipts");

  const ocrAvailable = await isOcrAvailable();
  let parsed = {};
  if (ocrAvailable) {
    const text = await ocrImage(buffer, ext);
    if (text) parsed = parseReceiptText(text);
  }

  return ok({ url, ocrAvailable, ...parsed });
}
