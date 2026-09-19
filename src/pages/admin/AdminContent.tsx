// Admin Website Content: free-text sections of the public site that are stored
// in page_sections (page_key + section_key). Missing rows fall back to neutral
// placeholders on the public pages, so nothing looks broken before it is written.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, PanelsTopLeft, Plus, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { PageSection } from "@/types/database";

interface KnownSection {
  page_key: string;
  section_key: string;
  pageLabel: string;
  label: string;
  hint?: string;
  withImage?: boolean;
}

const KNOWN: KnownSection[] = [
  { page_key: "about", section_key: "facilities", pageLabel: "About", label: "Facilities", hint: "Classrooms, library, training ground and other facilities." },
  { page_key: "about", section_key: "why_us", pageLabel: "About", label: "Why choose us" },
  { page_key: "admissions", section_key: "process", pageLabel: "Admissions", label: "Admission process", hint: "Explain the steps an applicant follows." },
  { page_key: "admissions", section_key: "documents", pageLabel: "Admissions", label: "Documents required" },
  { page_key: "contact", section_key: "visit", pageLabel: "Contact", label: "Visit us", withImage: true },
  { page_key: "home", section_key: "welcome", pageLabel: "Home", label: "Welcome note", withImage: true },
  { page_key: "legal", section_key: "privacy-policy", pageLabel: "Policies", label: "Privacy Policy" },
  { page_key: "legal", section_key: "terms", pageLabel: "Policies", label: "Terms & Conditions" },
  { page_key: "legal", section_key: "refund-policy", pageLabel: "Policies", label: "Refund Policy" },
];

interface Draft { heading: string; body: string; image_url: string; image_position: string; }

export default function AdminContent() {
  const qc = useQueryClient();
  const [active, setActive] = useState<KnownSection>(KNOWN[0]);
  const [draft, setDraft] = useState<Draft>({ heading: "", body: "", image_url: "", image_position: "center" });
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState({ page_key: "", section_key: "", label: "" });
  const [addingError, setAddingError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<PageSection | null>(null);

  const { data: sections, isLoading, isError, error } = useQuery({
    queryKey: ["admin_page_sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("page_sections").select("*").order("page_key");
      if (error) throw error;
      return data as PageSection[];
    },
  });

  const byKey = useMemo(() => {
    const map = new Map<string, PageSection>();
    (sections ?? []).forEach((s) => map.set(`${s.page_key}::${s.section_key}`, s));
    return map;
  }, [sections]);

  const current = byKey.get(`${active.page_key}::${active.section_key}`) ?? null;

  useEffect(() => {
    setDraft({
      heading: current?.heading ?? "",
      body: current?.body ?? "",
      image_url: current?.image_url ?? "",
      image_position: current?.image_position ?? "center",
    });
  }, [current?.id, active.page_key, active.section_key, current?.heading, current?.body, current?.image_url, current?.image_position]);

  // Custom sections that already exist in the database.
  const customSections = useMemo(
    () => (sections ?? []).filter((s) => !KNOWN.some((k) => k.page_key === s.page_key && k.section_key === s.section_key)),
    [sections],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.body.trim() && !draft.heading.trim()) throw new Error("Write some content before saving, or use Reset.");
      const payload = {
        page_key: active.page_key,
        section_key: active.section_key,
        heading: draft.heading.trim() || null,
        body: draft.body.trim() || null,
        image_url: draft.image_url.trim() || null,
        image_position: draft.image_position,
      };
      const { error } = await supabase.from("page_sections").upsert(payload, { onConflict: "page_key,section_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Content saved — the public page updates immediately.");
      qc.invalidateQueries({ queryKey: ["admin_page_sections"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save the content"),
  });

  const reset = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const { error } = await supabase.from("page_sections").delete().eq("id", current.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reverted to the default text");
      qc.invalidateQueries({ queryKey: ["admin_page_sections"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (s: PageSection) => {
      const { error } = await supabase.from("page_sections").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["admin_page_sections"] }); setConfirmDelete(null); },
    onError: (e: any) => { toast.error(e.message); setConfirmDelete(null); },
  });

  function addCustom() {
    const page_key = custom.page_key.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const section_key = custom.section_key.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!page_key || !section_key) {
      setAddingError("Both a page key and a section key are required (lowercase letters, numbers and hyphens).");
      return;
    }
    if (byKey.has(`${page_key}::${section_key}`)) {
      setAddingError("A section with that page key and section key already exists.");
      return;
    }
    setActive({ page_key, section_key, pageLabel: custom.label || page_key, label: custom.label || section_key });
    setAdding(false);
    setAddingError("");
    setCustom({ page_key: "", section_key: "", label: "" });
  }

  const groups = useMemo(() => {
    const out = new Map<string, KnownSection[]>();
    KNOWN.forEach((k) => out.set(k.pageLabel, [...(out.get(k.pageLabel) ?? []), k]));
    return Array.from(out.entries());
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Website Content</h1>
          <p className="mt-0.5 text-sm text-muted">Edit text shown on the public website. Changes appear as soon as you save.</p>
        </div>
        <Button variant="outline" onClick={() => { setAdding(true); setAddingError(""); }}><Plus className="h-4 w-4" aria-hidden /> Custom section</Button>
      </div>

      {isLoading ? (
        <Spinner label="Loading website content…" />
      ) : isError ? (
        <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load website content."}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          {/* Section list */}
          <Card className="p-3">
            <nav aria-label="Website sections" className="space-y-4">
              {groups.map(([page, items]) => (
                <div key={page}>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{page}</p>
                  <ul className="space-y-0.5">
                    {items.map((k) => {
                      const filled = byKey.has(`${k.page_key}::${k.section_key}`);
                      const isActive = active.page_key === k.page_key && active.section_key === k.section_key;
                      return (
                        <li key={`${k.page_key}::${k.section_key}`}>
                          <button
                            onClick={() => setActive(k)}
                            className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm ${isActive ? "bg-navy text-white" : "text-ink/80 hover:bg-navy-50"}`}
                          >
                            <span>{k.label}</span>
                            {filled ? <span className={`text-[10px] ${isActive ? "text-white/70" : "text-success"}`}>edited</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {customSections.length ? (
                <div>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Custom sections</p>
                  <ul className="space-y-0.5">
                    {customSections.map((s) => (
                      <li key={s.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setActive({ page_key: s.page_key, section_key: s.section_key, pageLabel: "Custom", label: `${s.page_key} / ${s.section_key}` })}
                          className={`flex-1 rounded-md px-2.5 py-2 text-left text-sm ${active.page_key === s.page_key && active.section_key === s.section_key ? "bg-navy text-white" : "text-ink/80 hover:bg-navy-50"}`}
                        >
                          {s.heading || `${s.page_key} / ${s.section_key}`}
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(s)} aria-label="Delete custom section"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </nav>
          </Card>

          {/* Editor */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-heading font-bold text-navy">
                  <PanelsTopLeft className="h-4 w-4 text-problue" aria-hidden />
                  {active.pageLabel} · {active.label}
                </h2>
                <p className="mt-0.5 font-mono text-[11px] text-muted">{active.page_key} / {active.section_key}</p>
              </div>
              <Badge tone={current ? "green" : "gray"}>{current ? "Customised" : "Using default text"}</Badge>
            </div>

            {active.hint ? <p className="mt-3 rounded-md bg-navy-50 p-3 text-xs text-navy">{active.hint}</p> : null}

            <form
              className="mt-4 space-y-4"
              noValidate
              onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
            >
              <Field label="Heading" hint="Optional — leave empty to use the default heading">
                <Input value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
              </Field>
              <Field label="Content" hint="Plain text. Line breaks are preserved on the website.">
                <Textarea rows={12} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Image URL" hint="Optional — paste a URL from the Media Library">
                  <Input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
                </Field>
                <Field label="Image focus">
                  <Select value={draft.image_position} onChange={(e) => setDraft({ ...draft, image_position: e.target.value })}>
                    <option value="center">Centre</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </Select>
                </Field>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-lightgray pt-4">
                {current ? (
                  <Button type="button" variant="ghost" onClick={() => reset.mutate()} loading={reset.isPending}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Reset to default
                  </Button>
                ) : null}
                <Button type="submit" loading={save.isPending}><Save className="h-4 w-4" aria-hidden /> Save Content</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Custom section modal */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a custom section">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Custom sections use a page key and a section key. Use them only if a developer has added a matching
            placeholder on a public page.
          </p>
          <Field label="Page key" required hint="e.g. home, about, admissions">
            <Input value={custom.page_key} onChange={(e) => setCustom({ ...custom, page_key: e.target.value })} />
          </Field>
          <Field label="Section key" required hint="e.g. facilities, faq">
            <Input value={custom.section_key} onChange={(e) => setCustom({ ...custom, section_key: e.target.value })} />
          </Field>
          <Field label="Label" hint="Shown only in this dashboard">
            <Input value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} />
          </Field>
          {addingError ? <p className="error-text" role="alert">{addingError}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addCustom}>Open editor</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
        title="Delete section"
        message={`Delete the “${confirmDelete?.page_key} / ${confirmDelete?.section_key}” content? The public page reverts to its default text.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
