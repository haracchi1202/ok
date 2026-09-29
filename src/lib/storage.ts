import path from "path";
import { mkdir, unlink } from "fs/promises";
import { randomBytes } from "crypto";
import sharp from "sharp";

// 画像はアップロード時に「大サイズ」と「サムネイル」の2種類の WebP を生成して保存する。
// 保存先は公開ディレクトリ外 (UPLOAD_DIR) で、/media/* のルートハンドラ経由で配信する。
// 本番でオブジェクトストレージを使う場合はこのモジュールを差し替える。

export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export type SavedImage = { path: string; thumbPath: string; width: number; height: number };

export async function saveImage(
  file: File,
  folder: string,
  opts: { width: number; height: number; thumbWidth: number; thumbHeight: number; fit?: "cover" | "inside" },
): Promise<SavedImage> {
  if (!ALLOWED.includes(file.type)) throw new Error("JPEG / PNG / WebP / AVIF の画像を選択してください");
  if (file.size > MAX_BYTES) throw new Error("画像サイズは8MB以下にしてください");
  const buf = Buffer.from(await file.arrayBuffer());
  return saveImageBuffer(buf, folder, opts);
}

export async function saveImageBuffer(
  buf: Buffer,
  folder: string,
  opts: { width: number; height: number; thumbWidth: number; thumbHeight: number; fit?: "cover" | "inside" },
): Promise<SavedImage> {
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const dir = path.join(UPLOAD_ROOT, safeFolder);
  await mkdir(dir, { recursive: true });
  const id = randomBytes(10).toString("hex");
  const fit = opts.fit ?? "cover";
  // sharp で再エンコードすることで EXIF (位置情報など) も除去される
  const large = await sharp(buf).rotate().resize(opts.width, opts.height, { fit, withoutEnlargement: false }).webp({ quality: 82 }).toFile(path.join(dir, `${id}.webp`));
  await sharp(buf).rotate().resize(opts.thumbWidth, opts.thumbHeight, { fit }).webp({ quality: 75 }).toFile(path.join(dir, `${id}_t.webp`));
  return {
    path: `/media/${safeFolder}/${id}.webp`,
    thumbPath: `/media/${safeFolder}/${id}_t.webp`,
    width: large.width,
    height: large.height,
  };
}

export async function deleteImage(publicPath: string | null | undefined) {
  if (!publicPath?.startsWith("/media/")) return;
  const full = path.resolve(UPLOAD_ROOT, publicPath.slice("/media/".length));
  if (!full.startsWith(UPLOAD_ROOT)) return;
  await unlink(full).catch(() => undefined);
}

export const IMAGE_PRESETS = {
  therapist: { width: 900, height: 1200, thumbWidth: 420, thumbHeight: 560 },
  diary: { width: 1200, height: 900, thumbWidth: 480, thumbHeight: 360, fit: "inside" as const },
  banner: { width: 1600, height: 800, thumbWidth: 800, thumbHeight: 400 },
  wide: { width: 1200, height: 675, thumbWidth: 600, thumbHeight: 338 },
};
