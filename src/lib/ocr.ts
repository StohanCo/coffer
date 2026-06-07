import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

const exec = promisify(execFile);

let available: boolean | null = null;

/**
 * On-server OCR using the system `tesseract` binary — no third party, no network.
 *
 * The Docker image installs `tesseract-ocr` + the English data pack. On a dev
 * machine without it, OCR simply reports unavailable and the caller falls back
 * to storing the receipt with no auto-fill.
 */
export async function isOcrAvailable(): Promise<boolean> {
  if (available !== null) return available;
  try {
    await exec("tesseract", ["--version"]);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

/**
 * Runs OCR over an image buffer and returns the raw recognised text.
 * Returns null if OCR isn't available or the binary errors out.
 */
export async function ocrImage(buffer: Buffer, ext = ".png"): Promise<string | null> {
  if (!(await isOcrAvailable())) return null;

  const tmp = path.join(os.tmpdir(), `finops-ocr-${randomUUID()}${ext}`);
  try {
    await fs.writeFile(tmp, buffer);
    // `stdout` target prints recognised text to stdout. --psm 6 = assume a
    // uniform block of text, which suits receipts better than the default.
    const { stdout } = await exec("tesseract", [tmp, "stdout", "--psm", "6"], {
      maxBuffer: 1024 * 1024 * 8,
      timeout: 30_000,
    });
    return stdout;
  } catch {
    return null;
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}
