// Admin Media Library: every uploaded image indexed with alt text, category and
// usage references. Deletion is blocked while an asset is still in use, and
// archiving is the preferred way to retire an asset.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Search, Copy, Archive, ArchiveRestore, Trash2, LibraryBig, AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadPublic, removeObject, IMAGE_ACCEPT, fileNameFromPath, type PublicBucket } from "@/lib/storage";
import { formatDate, bytes } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog } from "@/components/ui";
import type { MediaAsset } from "@/types/database";

const CATEGORIES = ["Gallery", "Hero", "Courses", "Achievements", "Faculty", "Website", "Other"];

export default function AdminMedia() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [altText, setAltText] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Gallery");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<MediaAsset | null>(null);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["admin_media"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as MediaAsset[];
    },
  });

  const filtered = useMemo(() => (assets ?? []).filter((a) => {
    if (showArchived !== a.is_archived) return false;
    if (category && a.category !== category) return false;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      return a.file_name.toLowerCase().includes(t) || a.alt_text.toLowerCase().includes(t) || a.path.toLowerCase().includes(t);
    }
    return true;
  }), [assets, q, category, showArchived]);

  function publicUrl(asset: MediaAsset) {
    const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.path);
    return data.publicUrl;
  }

  async function onUpload(files: FileList) {
    if (!altText.trim()) {
      toast.error("Add descriptive alt text first — it is required for accessibility.");
      return;
    }
    setUploading(true);
    try {
      const rows: Record<string, unknown>[] = [];
      for (const file of Array.from(files)) {
        const bucket: PublicBucket = uploadCategory === "Faculty" ? "faculty-photos" : "site-assets";
        const { path, url } = await uploadPublic(bucket, file, uploadCategory.toLowerCase());
        void url;
        rows.push({
          bucket,
          path,
          file_name: file.name || fileNameFromPath(path),
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          alt_text: altText.trim(),
          category: uploadCategory,
        });
      }
      const { error } = await supabase.from("media_assets").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} file(s) added to the library`);
      setUploadOpen(false);
      setAltText("");
      qc.invalidateQueries({ queryKey: ["admin_media"] });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const saveAlt = useMutation({
    mutationFn: async (asset: MediaAsset) => {
      const { error } = await supabase.from("media_assets").update({ alt_text: editAlt.trim() }).eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Alt text saved"); qc.invalidateQueries({ queryKey: ["admin_media"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async ({ asset, restore }: { asset: MediaAsset; restore?: boolean }) => {
      const { error } = await supabase.from("media_assets").update({ is_archived: !restore }).eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.restore ? "Asset restored" : "Asset archived");
      qc.invalidateQueries({ queryKey: ["admin_media"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (asset: MediaAsset) => {
      if (asset.usage_refs?.length) {
        throw new Error(`This image is still used by ${asset.usage_refs.length} record(s). Archive it instead.`);
      }
      try { await removeObject(asset.bucket as PublicBucket, asset.path); } catch { /* storage may already be empty */ }
      const { error } = await supabase.from("media_assets").delete().eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Asset deleted"); qc.invalidateQueries({ queryKey: ["admin_media"] }); setConfirmDelete(null); },
    onError: (e: any) => { toast.error(e.message, { duration: 6000 }); setConfirmDelete(null); },
  });

  async function copyUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(publicUrl(asset));
      toast.success("Image URL copied");
    } catch {
      toast.error("Could not copy — open the image and copy the address instead.");
    }
  }

  const isPublic = (bucket: string) =>
    ["site-assets", "course-images", "gallery", "achievement-photos", "faculty-photos"].includes(bucket);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Media Library</h1>
          <p className="mt-0.5 text-sm text-muted">Images used across the website, with alt text for accessibility.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Upload</Button>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search file name or alt text…" className="pl-9" aria-label="Search media" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </Card>

      {isLoading ? (
        <Spinner label="Loading media…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived media" : "No media yet"}
          description="Upload images you would like to use on the website. Always add descriptive alt text."
          action={!showArchived ? <Button onClick={() => setUploadOpen(true)}>Upload</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((a) => (
            <Card key={a.id} className={`flex flex-col overflow-hidden ${a.is_archived ? "opacity-60" : ""}`}>
              {isPublic(a.bucket) ? (
                <img src={publicUrl(a)} alt={a.alt_text} className="h-36 w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-36 place-items-center bg-navy-50">
                  <LibraryBig className="h-7 w-7 text-navy-300" aria-hidden />
                </div>
              )}
              <div className="flex flex-1 flex-col p-3">
                <p className="truncate text-sm font-medium text-navy" title={a.file_name}>{a.file_name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.alt_text || "No alt text"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone="gray">{a.category}</Badge>
                  {a.size_bytes ? <Badge tone="gray">{bytes(a.size_bytes)}</Badge> : null}
                  {a.is_archived ? <Badge tone="red">Archived</Badge> : null}
                </div>
                {a.usage_refs?.length ? (
                  <p className="mt-2 flex items-start gap-1 text-[11px] text-saffron-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    Used in {a.usage_refs.length} place(s)
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted">Added {formatDate(a.created_at)}</p>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-lightgray pt-2">
                  <Button variant="ghost" size="sm" onClick={() => copyUrl(a)} aria-label={`Copy URL for ${a.file_name}`}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditAlt(a.alt_text); setEditing(a); }}>Alt text</Button>
                  <Button variant="ghost" size="sm" onClick={() => archive.mutate({ asset: a, restore: a.is_archived })}>
                    {a.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" aria-hidden /> : <Archive className="h-3.5 w-3.5" aria-hidden />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(a)} aria-label={`Delete ${a.file_name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Add media">
        <div className="space-y-4">
          <Field label="Alt text" required hint="Describe the image for screen readers and search engines">
            <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="e.g. Cadets practising drill on the academy ground" />
          </Field>
          <Field label="Category">
            <Select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <label className={`btn-outline btn-sm w-full justify-center ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> {uploading ? "Uploading…" : "Choose image(s)"}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }}
            />
          </label>
          <p className="text-xs text-muted">JPG, PNG or WebP up to 8 MB each.</p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Alt text modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit alt text">
        <div className="space-y-4">
          <Field label="Alt text" required>
            <Input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!editAlt.trim()} onClick={() => editing && saveAlt.mutate(editing)} loading={saveAlt.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
        title="Delete media"
        message={`Permanently delete “${confirmDelete?.file_name}”? Images still referenced by a page cannot be deleted — archive them instead.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
