// Supabase Storage helpers shared by every upload screen.
// Public buckets (gallery, site-assets, faculty-photos, achievement-photos) return
// a permanent URL. Private buckets (resources, submissions, documents) return the
// object path only — callers must request a short-lived signed URL to read them.
import { supabase } from "@/lib/supabase";

export const PUBLIC_BUCKETS = [
  "site-assets",
  "course-images",
  "gallery",
  "achievement-photos",
  "faculty-photos",
] as const;

export const PRIVATE_BUCKETS = [
  "student-resources",
  "assignment-files",
  "assignment-submissions",
  "student-documents",
  "message-attachments",
] as const;

export type PublicBucket = (typeof PUBLIC_BUCKETS)[number];
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/avif";
export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip";

const MAX_BYTES = 8 * 1024 * 1024;

function safeName(file: File) {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${crypto.randomUUID()}.${ext || "bin"}`;
}

function assertSize(file: File, maxBytes = MAX_BYTES) {
  if (file.size > maxBytes) {
    throw new Error(`“${file.name}” is larger than ${Math.round(maxBytes / (1024 * 1024))} MB. Please compress it and try again.`);
  }
}

/** Upload to a public bucket and return both the object path and its public URL. */
export async function uploadPublic(
  bucket: PublicBucket,
  file: File,
  folder?: string,
): Promise<{ path: string; url: string }> {
  assertSize(file);
  const path = `${folder ? `${folder.replace(/\/+$/, "")}/` : ""}${safeName(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/** Upload to a private bucket. Only the object path is stored; read via signedUrl(). */
export async function uploadPrivate(
  bucket: PrivateBucket,
  file: File,
  folder: string,
  maxBytes = 25 * 1024 * 1024,
): Promise<{ path: string }> {
  assertSize(file, maxBytes);
  const path = `${folder.replace(/\/+$/, "")}/${safeName(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return { path };
}

/** Create a short-lived signed URL for an object in a private bucket. */
export async function signedUrl(
  bucket: PrivateBucket,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Open a private file in a new tab using a fresh signed URL. */
export async function openPrivateFile(bucket: PrivateBucket, path: string): Promise<void> {
  const url = await signedUrl(bucket, path);
  if (!url) throw new Error("This file is not available to your account.");
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Remove an object from storage; storage policies still enforce who may delete. */
export async function removeObject(bucket: PublicBucket | PrivateBucket, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/** Best-effort human label for a storage object path. */
export function fileNameFromPath(path: string) {
  return path.split("/").pop() ?? path;
}
