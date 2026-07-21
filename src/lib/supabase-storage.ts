// Supabase Storage access via its REST API — deliberately no @supabase/supabase-js
// dependency: Vercel installs with bun (see bun.lock), and talking to Storage
// over fetch keeps the lockfile untouched. SERVER-ONLY: this reads the
// service-role key, so never import it from a client component.
import { randomUUID } from "node:crypto";

export const PRODUCT_IMAGES_BUCKET = "product-images";

// Max upload size, mirrored on the client for a fast pre-check.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

// Map a MIME type to a file extension for the stored object's key.
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Whether the Supabase Storage env vars are present. */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function config(): { baseUrl: string; key: string } {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) {
    throw new Error(
      "La subida de imágenes no está configurada (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return { baseUrl, key };
}

function publicPrefix(baseUrl: string): string {
  return `${baseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
}

/** Upload one image to the bucket and return its public URL. */
export async function uploadProductImage(file: File): Promise<string> {
  const { baseUrl, key } = config();
  const ext = IMAGE_EXT[file.type.toLowerCase()] ?? "jpg";
  // Year-foldered, random filename: no collisions, no reliance on a product id
  // (a brand-new product has none yet when its photo is first uploaded).
  const path = `${new Date().getFullYear()}/${randomUUID()}.${ext}`;

  const res = await fetch(
    `${baseUrl}/storage/v1/object/${PRODUCT_IMAGES_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": file.type || "application/octet-stream",
        "cache-control": "31536000",
        "x-upsert": "true",
      },
      body: Buffer.from(await file.arrayBuffer()),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `No se pudo subir la imagen a Storage (HTTP ${res.status}). ${detail}`.trim(),
    );
  }
  return `${publicPrefix(baseUrl)}${path}`;
}

/**
 * Best-effort deletion of a previously uploaded image, given its public URL.
 * A URL that isn't one of ours (e.g. an older manually-pasted link) is left
 * alone, and any failure is swallowed — an orphaned object is harmless.
 */
export async function removeProductImage(
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl || !isStorageConfigured()) return;
  const { baseUrl, key } = config();
  const prefix = publicPrefix(baseUrl);
  if (!publicUrl.startsWith(prefix)) return;
  const path = publicUrl.slice(prefix.length);
  try {
    await fetch(`${baseUrl}/storage/v1/object/${PRODUCT_IMAGES_BUCKET}/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch {
    // best-effort
  }
}
