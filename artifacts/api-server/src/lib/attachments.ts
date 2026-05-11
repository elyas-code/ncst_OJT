const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_DATA_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "video/mp4", "audio/mpeg", "text/plain", "application/zip",
  "application/octet-stream",
]);

export type AttachmentValidation = { ok: true } | { ok: false; error: string };

export function validateAttachmentUrl(url: unknown, maxBytes = MAX_BYTES): AttachmentValidation {
  if (url == null || url === "") return { ok: true };
  if (typeof url !== "string") return { ok: false, error: "url must be a string" };
  if (url.length > Math.ceil(maxBytes * 1.4) + 200) {
    return { ok: false, error: `Attachment too large. Max ${(maxBytes/1024/1024).toFixed(0)} MB.` };
  }
  let scheme = "";
  try { scheme = url.slice(0, url.indexOf(":")).toLowerCase(); } catch { /* noop */ }
  if (!["http", "https", "data"].includes(scheme)) {
    return { ok: false, error: "Only http, https, and data: URLs are allowed" };
  }
  if (scheme === "data") {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url);
    if (!m) return { ok: false, error: "Malformed data URL" };
    const mime = m[1].toLowerCase();
    const isBase64 = !!m[2];
    const payload = m[3] ?? "";
    if (!ALLOWED_DATA_MIME.has(mime)) {
      return { ok: false, error: `Unsupported file type: ${mime}` };
    }
    const bytes = isBase64 ? Math.floor(payload.length * 3 / 4) : payload.length;
    if (bytes > maxBytes) {
      return { ok: false, error: `File too large (${(bytes/1024/1024).toFixed(1)} MB). Max ${(maxBytes/1024/1024).toFixed(0)} MB.` };
    }
  }
  return { ok: true };
}

export function sanitizeSize(size: unknown): number | null {
  if (size == null) return null;
  const n = typeof size === "number" ? size : parseInt(String(size), 10);
  if (!Number.isFinite(n) || n < 0 || n > MAX_BYTES) return null;
  return n;
}
