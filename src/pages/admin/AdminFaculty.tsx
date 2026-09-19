// Admin Faculty Profiles: the teaching team shown on the public About page.
// Profiles are drafts until published, and archived rather than deleted so
// historical references keep working.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Eye, EyeOff, Archive, ArchiveRestore, Upload, UserCog, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadPublic, IMAGE_ACCEPT } from "@/lib/storage";
import { Button, Card, EmptyState, Field, Input, Modal, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { FacultyProfile } from "@/types/database";

interface FormState {
  name: string;
  designation: string;
  subject_area: string;
  bio: string;
  photo_url: string;
  display_order: number;
  is_published: boolean;
}

const EMPTY: FormState = { name: "", designation: "", subject_area: "", bio: "", photo_url: "", display_order: 100, is_published: false };

export default function AdminFaculty() {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FacultyProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<FacultyProfile | null>(null);

  const { data: faculty, isLoading } = useQuery({
    queryKey: ["admin_faculty"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faculty_profiles").select("*").order("display_order");
      if (error) throw error;
      return data as FacultyProfile[];
    },
  });

  const list = (faculty ?? []).filter((f) => (showArchived ? !!f.archived_at : !f.archived_at));

  function openCreate() { setForm(EMPTY); setError(""); setCreating(true); }
  function openEdit(f: FacultyProfile) {
    setForm({
      name: f.name, designation: f.designation ?? "", subject_area: f.subject_area ?? "",
      bio: f.bio ?? "", photo_url: f.photo_url ?? "", display_order: f.display_order, is_published: f.is_published,
    });
    setError("");
    setEditing(f);
  }

  async function onPickPhoto(file: File) {
    setUploading(true);
    try {
      const { url } = await uploadPublic("faculty-photos", file, "faculty");
      setForm((f) => ({ ...f, photo_url: url }));
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.name.trim().length < 2) throw new Error("Enter the faculty member's name");
      const payload = {
        name: values.name.trim(),
        designation: values.designation.trim() || null,
        subject_area: values.subject_area.trim() || null,
        bio: values.bio.trim() || null,
        photo_url: values.photo_url.trim() || null,
        display_order: Number(values.display_order) || 100,
        is_published: values.is_published,
      };
      if (id) {
        const { error } = await supabase.from("faculty_profiles").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faculty_profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Profile updated" : "Profile added");
      qc.invalidateQueries({ queryKey: ["admin_faculty"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the profile"),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from("faculty_profiles").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["admin_faculty"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async ({ f, restore }: { f: FacultyProfile; restore?: boolean }) => {
      const { error } = await supabase
        .from("faculty_profiles")
        .update({ archived_at: restore ? null : new Date().toISOString(), is_published: restore ? f.is_published : false })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.restore ? "Profile restored" : "Profile archived");
      qc.invalidateQueries({ queryKey: ["admin_faculty"] });
      setConfirmArchive(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Faculty Profiles</h1>
          <p className="mt-0.5 text-sm text-muted">Published profiles appear on the About page. Add real, verified details only.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Profile</Button>
      </div>

      <Card className="flex flex-wrap items-center gap-4 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived profiles
        </label>
        <p className="text-xs text-muted">{list.length} profile(s)</p>
      </Card>

      {isLoading ? (
        <Spinner label="Loading faculty…" />
      ) : list.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived profiles" : "No faculty profiles yet"}
          description="Add the teaching team with verified names, designations and subjects."
          action={!showArchived ? <Button onClick={openCreate}>New Profile</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((f) => (
            <Card key={f.id} className={`flex flex-col p-5 ${f.archived_at ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-navy-50">
                  {f.photo_url ? (
                    <img src={f.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center"><UserCog className="h-6 w-6 text-navy-300" aria-hidden /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading font-bold text-navy">{f.name}</h2>
                  <p className="text-xs text-muted">{f.designation ?? "—"}</p>
                  <p className="text-xs text-muted">{f.subject_area ?? ""}</p>
                </div>
              </div>
              {f.bio ? <p className="mt-3 flex-1 text-sm text-ink/90">{f.bio}</p> : <div className="flex-1" />}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={f.archived_at ? "gray" : f.is_published ? "green" : "amber"}>
                  {f.archived_at ? "Archived" : f.is_published ? "Published" : "Draft"}
                </Badge>
                <Badge tone="gray">Order {f.display_order}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                <Button variant="outline" size="sm" disabled={!!f.archived_at} onClick={() => patch.mutate({ id: f.id, values: { is_published: !f.is_published } })}>
                  {f.is_published ? <><EyeOff className="h-3.5 w-3.5" aria-hidden /> Unpublish</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Publish</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(f)}>
                  {f.archived_at ? <><ArchiveRestore className="h-3.5 w-3.5" aria-hidden /> Restore</> : <><Archive className="h-3.5 w-3.5" aria-hidden /> Archive</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Profile" : "New Faculty Profile"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Designation" hint="e.g. Faculty — Mathematics"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject area"><Input value={form.subject_area} onChange={(e) => setForm({ ...form, subject_area: e.target.value })} /></Field>
            <Field label="Display order" hint="Lower numbers appear first"><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Short bio"><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>

          <div>
            <p className="label">Photograph</p>
            <div className="flex flex-wrap items-center gap-3">
              {form.photo_url ? (
                <div className="relative">
                  <img src={form.photo_url} alt="Selected photograph preview" className="h-20 w-20 rounded-full object-cover" />
                  <button type="button" onClick={() => setForm({ ...form, photo_url: "" })} className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-error shadow-card" aria-label="Remove photograph">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <label className="btn-outline btn-sm cursor-pointer">
                <Upload className="h-3.5 w-3.5" aria-hidden /> {uploading ? "Uploading…" : "Upload photo"}
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickPhoto(f); e.target.value = ""; }}
                />
              </label>
              <span className="text-xs text-muted">JPG, PNG or WebP up to 8 MB.</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            Publish this profile on the website
          </label>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Profile</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && archive.mutate({ f: confirmArchive, restore: !!confirmArchive.archived_at })}
        title={confirmArchive?.archived_at ? "Restore profile" : "Archive profile"}
        message={confirmArchive?.archived_at
          ? `${confirmArchive?.name} will be available to publish again.`
          : `${confirmArchive?.name} will be hidden from the website. You can restore the profile later.`}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />
    </div>
  );
}
