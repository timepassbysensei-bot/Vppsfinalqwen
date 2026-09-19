// Admin FAQs & Chatbot: manage the assistant's knowledge base and triage the
// questions it could not answer. Only published FAQs are sent to the AI as context.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Eye, EyeOff, Archive, ArchiveRestore, Search, MessageCircleQuestion, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { ChatbotFaq, ChatbotUnansweredQuestion } from "@/types/database";

interface FormState { question: string; answer: string; category: string; is_published: boolean; }
const EMPTY: FormState = { question: "", answer: "", category: "General", is_published: true };

export default function AdminFaqs() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ChatbotFaq | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [confirmArchive, setConfirmArchive] = useState<ChatbotFaq | null>(null);
  const [answering, setAnswering] = useState<ChatbotUnansweredQuestion | null>(null);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["admin_faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chatbot_faqs").select("*").order("category").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ChatbotFaq[];
    },
  });

  const { data: unanswered } = useQuery({
    queryKey: ["admin_unanswered"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_unanswered_questions")
        .select("*")
        .is("resolved_faq_id", null)
        .order("last_asked_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ChatbotUnansweredQuestion[];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set((faqs ?? []).map((f) => f.category))).sort(),
    [faqs],
  );

  const filtered = useMemo(() => (faqs ?? []).filter((f) => {
    if (!showArchived && f.archived_at) return false;
    if (showArchived && !f.archived_at) return false;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      return f.question.toLowerCase().includes(t) || f.answer.toLowerCase().includes(t);
    }
    return true;
  }), [faqs, q, showArchived]);

  function openCreate(prefill?: string) {
    setForm({ ...EMPTY, question: prefill ?? "" });
    setError("");
    setCreating(true);
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.question.trim().length < 5) throw new Error("Write the question as a visitor would ask it");
      if (values.answer.trim().length < 5) throw new Error("Add the answer the assistant should give");
      const payload = {
        question: values.question.trim(),
        answer: values.answer.trim(),
        category: values.category.trim() || "General",
        is_published: values.is_published,
      };
      if (id) {
        const { error } = await supabase.from("chatbot_faqs").update(payload).eq("id", id);
        if (error) throw error;
        return null;
      }
      const { data, error } = await supabase.from("chatbot_faqs").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: async (newId, vars) => {
      if (newId && answering) {
        await supabase.from("chatbot_unanswered_questions").update({ resolved_faq_id: newId }).eq("id", answering.id);
        qc.invalidateQueries({ queryKey: ["admin_unanswered"] });
      }
      toast.success(vars.id ? "FAQ updated" : "FAQ added");
      qc.invalidateQueries({ queryKey: ["admin_faqs"] });
      setCreating(false);
      setEditing(null);
      setAnswering(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the FAQ"),
  });

  const togglePublish = useMutation({
    mutationFn: async (f: ChatbotFaq) => {
      const { error } = await supabase.from("chatbot_faqs").update({ is_published: !f.is_published }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Publish status updated"); qc.invalidateQueries({ queryKey: ["admin_faqs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async ({ f, restore }: { f: ChatbotFaq; restore?: boolean }) => {
      const { error } = await supabase.from("chatbot_faqs").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.restore ? "FAQ restored" : "FAQ archived");
      qc.invalidateQueries({ queryKey: ["admin_faqs"] });
      setConfirmArchive(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">FAQs &amp; Chatbot</h1>
          <p className="mt-0.5 text-sm text-muted">The assistant answers only from these published FAQs, courses and contact details.</p>
        </div>
        <Button onClick={() => openCreate()}><Plus className="h-4 w-4" aria-hidden /> New FAQ</Button>
      </div>

      {/* Unanswered triage */}
      {unanswered?.length ? (
        <Card className="border-saffron-200 bg-saffron-50 p-5">
          <h2 className="flex items-center gap-2 font-heading font-bold text-navy">
            <MessageCircleQuestion className="h-5 w-5 text-saffron-600" aria-hidden />
            Questions the assistant couldn't answer ({unanswered.length})
          </h2>
          <p className="mt-1 text-sm text-muted">Answer these to improve the chatbot — no visitor personal data is stored.</p>
          <ul className="mt-3 divide-y divide-saffron-200">
            {unanswered.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{u.question}</p>
                  <p className="text-xs text-muted">Asked {u.asked_count}× · last {formatDateTime(u.last_asked_at)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setAnswering(u); openCreate(u.question); }}>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Add answer
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions and answers…" className="pl-9" aria-label="Search FAQs" />
        </div>
        <label className="flex items-center gap-2 px-1 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived only
        </label>
      </Card>

      {isLoading ? (
        <Spinner label="Loading FAQs…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived FAQs" : "No FAQs yet"}
          description="Add the questions visitors ask most — course details, eligibility, admissions, timings and documents."
          action={!showArchived ? <Button onClick={() => openCreate()}>New FAQ</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((f) => (
            <Card key={f.id} className={`flex flex-col p-5 ${f.archived_at ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-semibold text-navy">{f.question}</h3>
                <Badge tone={f.archived_at ? "gray" : f.is_published ? "green" : "amber"}>
                  {f.archived_at ? "Archived" : f.is_published ? "Live" : "Hidden"}
                </Badge>
              </div>
              <p className="mt-2 flex-1 whitespace-pre-line text-sm text-ink/90">{f.answer}</p>
              <p className="mt-3 text-xs text-muted">Category: {f.category}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Button variant="outline" size="sm" onClick={() => { setForm({ question: f.question, answer: f.answer, category: f.category, is_published: f.is_published }); setError(""); setEditing(f); }}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => togglePublish.mutate(f)}>
                  {f.is_published ? <><EyeOff className="h-3.5 w-3.5" aria-hidden /> Hide</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Publish</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(f)}>
                  {f.archived_at ? <><ArchiveRestore className="h-3.5 w-3.5" aria-hidden /> Restore</> : <><Archive className="h-3.5 w-3.5" aria-hidden /> Archive</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); setAnswering(null); }} title={editing ? "Edit FAQ" : answering ? "Answer this question" : "New FAQ"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <Field label="Question" required hint="Phrase it the way a visitor would ask">
            <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <Field label="Answer" required hint="Keep it short, factual and specific. Never promise results.">
            <Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="faq-categories" placeholder="Admissions" />
          </Field>
          <datalist id="faq-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            Publish — the assistant may use this answer
          </label>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); setAnswering(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save FAQ</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && archive.mutate({ f: confirmArchive, restore: !!confirmArchive.archived_at })}
        title={confirmArchive?.archived_at ? "Restore FAQ" : "Archive FAQ"}
        message={confirmArchive?.archived_at
          ? "This FAQ will be available to the assistant again."
          : "The assistant will stop using this answer. You can restore it later."}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />
    </div>
  );
}
