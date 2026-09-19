const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function isAllowedImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase());
}

export function isAllowedImageSize(byteLength: number): boolean {
  return byteLength > 0 && byteLength <= MAX_IMAGE_BYTES;
}

export function safeImageFileName(originalName: string): string {
  const normalized = originalName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const ext = normalized.endsWith(".png")
    ? "png"
    : normalized.endsWith(".webp")
      ? "webp"
      : "jpg";
  return `${crypto.randomUUID()}.${ext}`;
}
