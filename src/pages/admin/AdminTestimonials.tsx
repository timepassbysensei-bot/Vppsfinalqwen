// Admin Testimonials: approve, feature and edit student/parent quotes.
// Nothing appears on the public site until it is approved here.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, CheckCircle2, Star, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { Testimonial } from "@/types/database";

interface FormState { name: string; course: string; quote: string; rating: number; photo_url: string; is_approved: boolean; is_featured: boolean; }
const EMPTY: FormState = { name: "", course: "", quote: "", rating: 5, photo_url: "", is_approved: false, is_featured: false };

export default function AdminTestimonials() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Testimonial | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin_testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const filtered = useMemo(() => (items ?? []).filter((t) => {
    if (filter === "pending") return !t.is_approved;
    if (filter === "approved") return t.is_approved;
    return true;
  }), [items, filter]);

  const pendingCount = (items ?? []).filter((t) => !t.is_approved).length;

  function openCreate() { setForm(EMPTY); setError(""); setCreating(true); }
  function openEdit(t: Testimonial) {
    setForm({
      name: t.name, course: t.course ?? "", quote: t.quote, rating: t.rating,
      photo_url: t.photo_url ?? "", is_approved: t.is_approved, is_featured: t.is_featured,
    });
    setError("");
    setEditing(t);
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.name.trim().length < 2) throw new Error("Enter the person's name");
      if (values.quote.trim().length < 10) throw new Error("The quote is too short — add the full testimonial");
      const payload = {
        name: values.name.trim(),
        course: values.course.trim() || null,
        quote: values.quote.trim(),
        rating: Math.min(5, Math.max(1, Number(values.rating) || 5)),
        photo_url: values.is_approved ? values.photo_url.trim() || null : null,
        is_approved: values.is_approved,
        is_featured: values.is_featured,
      };
      if (id) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Testimonial updated" : "Testimonial added");
      qc.invalidateQueries({ queryKey: ["admin_testimonials"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the testimonial"),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from("testimonials").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Testimonial updated"); qc.invalidateQueries({ queryKey: ["admin_testimonials"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (t: Testimonial) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Testimonial deleted"); qc.invalidateQueries({ queryKey: ["admin_testimonials"] }); setConfirmDelete(null); },
    onError: (e: any) => { toast.error(e.message); setConfirmDelete(null); },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Testimonials</h1>
          <p className="mt-0.5 text-sm text-muted">Approved quotes appear on the website. Always ask permission before publishing.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Testimonial</Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="sm:w-56" aria-label="Filter testimonials">
          <option value="all">All testimonials</option>
          <option value="pending">Awaiting approval</option>
          <option value="approved">Approved</option>
        </Select>
        {pendingCount ? <Badge tone="amber">{pendingCount} awaiting approval</Badge> : null}
      </Card>

      {isLoading ? (
        <Spinner label="Loading testimonials…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={filter === "pending" ? "Nothing awaiting approval" : "No testimonials yet"}
          description="Add a quote from a student or parent after obtaining their permission."
          action={<Button onClick={openCreate}>New Testimonial</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-heading font-bold text-navy">{t.name}</h2>
                  <p className="text-xs text-muted">{t.course ?? "—"}</p>
                </div>
                <Badge tone={t.is_approved ? "green" : "amber"}>{t.is_approved ? "Approved" : "Pending"}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-0.5" aria-label={`${t.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-saffron text-saffron" : "text-lightgray"}`} aria-hidden />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 text-sm italic text-ink/90">“{t.quote}”</blockquote>
              {t.is_featured ? <div className="mt-3"><Badge tone="navy">Featured on home</Badge></div> : null}
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                {!t.is_approved ? (
                  <Button variant="outline" size="sm" onClick={() => patch.mutate({ id: t.id, values: { is_approved: true } })}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approve
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => patch.mutate({ id: t.id, values: { is_approved: false, is_featured: false } })}>
                    <EyeOff className="h-3.5 w-3.5" aria-hidden /> Unapprove
                  </Button>
                )}
                <Button variant="outline" size="sm" disabled={!t.is_approved} onClick={() => patch.mutate({ id: t.id, values: { is_featured: !t.is_featured } })}>
                  <Star className="h-3.5 w-3.5" aria-hidden /> {t.is_featured ? "Unfeature" : "Feature"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(t)}><Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Testimonial" : "New Testimonial"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Course" hint="Optional"><Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></Field>
          </div>
          <Field label="Quote" required><Textarea rows={4} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rating">
              <Select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r > 1 ? "s" : ""}</option>)}
              </Select>
            </Field>
            <Field label="Photo URL" hint={form.is_approved ? "Shown next to the quote" : "Only stored once approved"}>
              <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} disabled={!form.is_approved} />
            </Field>
          </div>
          <div className="space-y-2 rounded-md border border-lightgray p-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-lightgray text-navy" checked={form.is_approved} onChange={(e) => setForm({ ...form, is_approved: e.target.checked, is_featured: e.target.checked ? form.is_featured : false, photo_url: e.target.checked ? form.photo_url : "" })} />
              <span>Approved — I have permission to publish this quote (and photo, if provided).</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={form.is_featured} disabled={!form.is_approved} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
              Feature on the home page
            </label>
          </div>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Testimonial</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
        title="Delete testimonial"
        message={`Delete the testimonial from ${confirmDelete?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
