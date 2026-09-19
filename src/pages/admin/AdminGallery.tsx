// Admin Gallery: albums with cover images plus per-album photo management.
// Photos are uploaded to the public "gallery" bucket and indexed in the media
// library so usage can be traced before deleting anything.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Eye, EyeOff, Archive, ArchiveRestore, Upload, Images, Trash2, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadPublic, removeObject, IMAGE_ACCEPT, fileNameFromPath } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { GalleryAlbum, GalleryImage } from "@/types/database";

interface AlbumForm {
  title: string;
  description: string;
  event_date: string;
  category: string;
  display_order: number;
  status: GalleryAlbum["status"];
}

const EMPTY: AlbumForm = { title: "", description: "", event_date: "", category: "Academics", display_order: 100, status: "draft" };

export default function AdminGallery() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<GalleryAlbum | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<GalleryAlbum | null>(null);
  const [form, setForm] = useState<AlbumForm>(EMPTY);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [confirmArchive, setConfirmArchive] = useState<GalleryAlbum | null>(null);
  const [confirmImage, setConfirmImage] = useState<GalleryImage | null>(null);

  const { data: albums, isLoading } = useQuery({
    queryKey: ["admin_albums"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_albums").select("*").order("display_order");
      if (error) throw error;
      return data as GalleryAlbum[];
    },
  });

  const { data: images, isLoading: loadingImages } = useQuery({
    queryKey: ["admin_album_images", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .eq("album_id", selected!.id)
        .order("display_order");
      if (error) throw error;
      return data as GalleryImage[];
    },
  });

  const list = useMemo(() => (albums ?? []).filter((a) => (showArchived ? !!a.archived_at : !a.archived_at)), [albums, showArchived]);

  function openCreate() { setForm(EMPTY); setError(""); setCreating(true); }
  function openEdit(a: GalleryAlbum) {
    setForm({
      title: a.title, description: a.description ?? "", event_date: a.event_date ?? "",
      category: a.category ?? "", display_order: a.display_order, status: a.status,
    });
    setError("");
    setEditing(a);
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: AlbumForm; id?: string }) => {
      if (values.title.trim().length < 2) throw new Error("Give the album a title");
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        event_date: values.event_date || null,
        category: values.category.trim() || null,
        display_order: Number(values.display_order) || 100,
        status: values.status,
      };
      if (id) {
        const { error } = await supabase.from("gallery_albums").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gallery_albums").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Album updated" : "Album created");
      qc.invalidateQueries({ queryKey: ["admin_albums"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the album"),
  });

  const archive = useMutation({
    mutationFn: async ({ a, restore }: { a: GalleryAlbum; restore?: boolean }) => {
      const { error } = await supabase
        .from("gallery_albums")
        .update({ archived_at: restore ? null : new Date().toISOString(), status: restore ? a.status : "archived" })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.restore ? "Album restored" : "Album archived");
      qc.invalidateQueries({ queryKey: ["admin_albums"] });
      setConfirmArchive(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onUpload(files: FileList) {
    if (!selected) return;
    setUploading(true);
    try {
      const uploaded: { path: string; url: string }[] = [];
      for (const file of Array.from(files)) {
        const res = await uploadPublic("gallery", file, `albums/${selected.id}`);
        uploaded.push(res);
      }
      const baseOrder = (images?.length ?? 0) + 1;
      const { error } = await supabase.from("gallery_images").insert(
        uploaded.map((u, i) => ({
          album_id: selected.id,
          image_url: u.url,
          caption: i === 0 ? caption.trim() || null : null,
          display_order: baseOrder + i,
        })),
      );
      if (error) throw error;

      await supabase.from("media_assets").insert(
        uploaded.map((u) => ({
          bucket: "gallery",
          path: u.path,
          file_name: fileNameFromPath(u.path),
          mime_type: "image/*",
          size_bytes: 0,
          alt_text: caption.trim() || selected.title,
          category: "Gallery",
          usage_refs: [`gallery_album:${selected.id}`],
        })),
      );

      if (!selected.cover_url && uploaded[0]) {
        await supabase.from("gallery_albums").update({ cover_url: uploaded[0].url }).eq("id", selected.id);
      }

      toast.success(`${uploaded.length} photo(s) uploaded`);
      setCaption("");
      qc.invalidateQueries({ queryKey: ["admin_album_images", selected.id] });
      qc.invalidateQueries({ queryKey: ["admin_albums"] });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const removeImage = useMutation({
    mutationFn: async (img: GalleryImage) => {
      const path = img.image_url.split("/gallery/")[1]?.split("?")[0];
      if (path) {
        try { await removeObject("gallery", decodeURIComponent(path)); } catch { /* file may already be gone */ }
      }
      const { error } = await supabase.from("gallery_images").delete().eq("id", img.id);
      if (error) throw error;
      return img;
    },
    onSuccess: (img) => {
      toast.success("Photo removed");
      qc.invalidateQueries({ queryKey: ["admin_album_images", selected?.id] });
      qc.invalidateQueries({ queryKey: ["admin_albums"] });
      setConfirmImage(null);
      void img;
    },
    onError: (e: any) => { toast.error(e.message ?? "Could not delete the photo"); setConfirmImage(null); },
  });

  const updateCaption = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("gallery_images").update({ caption: value.trim() || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Caption saved"); qc.invalidateQueries({ queryKey: ["admin_album_images", selected?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
          <ChevronLeft className="h-4 w-4" aria-hidden /> All albums
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold sm:text-2xl">{selected.title}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {selected.category ?? "Uncategorised"} · {selected.event_date ? formatDate(selected.event_date) : "No date"} ·{" "}
              <Badge tone={selected.status === "published" ? "green" : "amber"}>{selected.status}</Badge>
            </p>
          </div>
          <label className={`btn-outline btn-sm ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> {uploading ? "Uploading…" : "Add photos"}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }}
            />
          </label>
        </div>

        <Card className="p-4">
          <Field label="Caption for the next upload" hint="Optional — can be edited per photo afterwards">
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Morning physical training session" />
          </Field>
        </Card>

        {loadingImages ? (
          <Spinner label="Loading photos…" />
        ) : !images?.length ? (
          <EmptyState
            title="No photos in this album"
            description="Add photographs taken at the academy. Make sure you have permission to publish them."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <Card key={img.id} className="overflow-hidden">
                <img src={img.image_url} alt={img.caption ?? ""} className="h-44 w-full object-cover" loading="lazy" />
                <div className="space-y-2 p-3">
                  <Input
                    defaultValue={img.caption ?? ""}
                    placeholder="Add a caption…"
                    aria-label={`Caption for photo ${img.display_order}`}
                    onBlur={(e) => {
                      if (e.target.value !== (img.caption ?? "")) updateCaption.mutate({ id: img.id, value: e.target.value });
                    }}
                  />
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Order {img.display_order}</span>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmImage(img)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!confirmImage}
          onClose={() => setConfirmImage(null)}
          onConfirm={() => confirmImage && removeImage.mutate(confirmImage)}
          title="Remove photo"
          message="This removes the photograph from the album and the gallery storage. This cannot be undone."
          confirmLabel="Remove"
          danger
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Gallery</h1>
          <p className="mt-0.5 text-sm text-muted">Albums of academy life. Published albums appear on the public gallery page.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Album</Button>
      </div>

      <Card className="flex flex-wrap items-center gap-4 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived albums
        </label>
        <p className="text-xs text-muted">{list.length} album(s)</p>
      </Card>

      {isLoading ? (
        <Spinner label="Loading albums…" />
      ) : list.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived albums" : "No albums yet"}
          description="Create an album such as “Classroom sessions” or “Annual sports day”, then add photographs."
          action={!showArchived ? <Button onClick={openCreate}>New Album</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <Card key={a.id} className={`flex flex-col overflow-hidden ${a.archived_at ? "opacity-60" : ""}`}>
              {a.cover_url ? (
                <img src={a.cover_url} alt="" className="h-40 w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-40 place-items-center bg-navy-50"><Images className="h-8 w-8 text-navy-300" aria-hidden /></div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-heading font-bold text-navy">{a.title}</h2>
                  <Badge tone={a.archived_at ? "gray" : a.status === "published" ? "green" : "amber"}>
                    {a.archived_at ? "Archived" : a.status}
                  </Badge>
                </div>
                <p className="mt-1 flex-1 text-xs text-muted">
                  {a.category ?? "Uncategorised"} · {a.event_date ? formatDate(a.event_date) : "No date"}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                  <Button variant="outline" size="sm" onClick={() => setSelected(a)}><Images className="h-3.5 w-3.5" aria-hidden /> Photos</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                  {!a.archived_at ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase.from("gallery_albums").update({ status: a.status === "published" ? "draft" : "published" }).eq("id", a.id);
                          if (error) toast.error(error.message);
                          else { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin_albums"] }); }
                        }}
                      >
                        {a.status === "published" ? <><EyeOff className="h-3.5 w-3.5" aria-hidden /> Unpublish</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Publish</>}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(a)}><Archive className="h-3.5 w-3.5" aria-hidden /> Archive</Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(a)}><ArchiveRestore className="h-3.5 w-3.5" aria-hidden /> Restore</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Album" : "New Album"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <Field label="Album title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Event date"><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
            <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Academics" /></Field>
            <Field label="Display order"><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Publish status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AlbumForm["status"] })}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Album</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && archive.mutate({ a: confirmArchive, restore: !!confirmArchive.archived_at })}
        title={confirmArchive?.archived_at ? "Restore album" : "Archive album"}
        message={confirmArchive?.archived_at
          ? `“${confirmArchive?.title}” will be available on the website again (with its previous publish status).`
          : `“${confirmArchive?.title}” will be hidden from the website. Photographs are kept. You can restore it later.`}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />
    </div>
  );
}
