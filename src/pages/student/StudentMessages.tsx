// Student Messages: start a conversation with the academy and read replies.
// RLS ensures a student can only ever see their own threads.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Send, MessagesSquare, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, Textarea } from "@/components/ui";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "admission", label: "Admission" },
  { value: "fee", label: "Fees" },
  { value: "exam", label: "Exams & tests" },
  { value: "other", label: "Other" },
];

export default function StudentMessages() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "general", message: "" });
  const [formError, setFormError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data: studentId } = useQuery({
    queryKey: ["my_student_id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id").eq("user_id", user!.id).maybeSingle();
      return data?.id ?? null;
    },
  });

  const { data: threads, isLoading } = useQuery({
    queryKey: ["student_threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("message_threads").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!selectedId && threads?.length) setSelectedId(threads[0].id);
  }, [selectedId, threads]);

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["student_thread_messages", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("thread_id", selectedId!).order("created_at");
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 20_000,
  });

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages]);

  const selected = useMemo(() => (threads ?? []).find((t) => t.id === selectedId) ?? null, [threads, selectedId]);

  const send = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Type a message first");
      const { error } = await supabase.from("messages").insert({ thread_id: selectedId!, body: text, sender_role: "student" });
      if (error) throw error;
      await supabase.from("message_threads").update({ updated_at: new Date().toISOString() }).eq("id", selectedId!);
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["student_thread_messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["student_threads", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send the message"),
  });

  const createThread = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Your login is not linked to a student record yet. Please contact the office.");
      if (form.subject.trim().length < 3) throw new Error("Enter a subject for your message");
      if (form.message.trim().length < 5) throw new Error("Write your message");
      const { data, error } = await supabase
        .from("message_threads")
        .insert({ student_id: studentId, subject: form.subject.trim(), category: form.category })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("messages").insert({ thread_id: data.id, body: form.message.trim(), sender_role: "student" });
      if (e2) throw e2;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Message sent to the academy");
      setComposing(false);
      setForm({ subject: "", category: "general", message: "" });
      setSelectedId(id);
      qc.invalidateQueries({ queryKey: ["student_threads", user?.id] });
    },
    onError: (e: any) => setFormError(e.message ?? "Could not start the conversation"),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Messages</h1>
          <p className="mt-0.5 text-sm text-muted">Ask your teachers or the office a question. Replies appear here.</p>
        </div>
        <Button onClick={() => { setFormError(""); setComposing(true); }}><Plus className="h-4 w-4" aria-hidden /> New message</Button>
      </div>

      {isLoading ? (
        <Spinner label="Loading your messages…" />
      ) : !threads?.length ? (
        <EmptyState
          title="No messages yet"
          description="Start a conversation about fees, exams, batch timings or anything else you need help with."
          action={<Button onClick={() => setComposing(true)}>New message</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <Card className={`overflow-hidden ${selectedId ? "hidden lg:block" : ""}`}>
            <ul className="max-h-[32rem] divide-y divide-lightgray overflow-y-auto" aria-label="My conversations">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full px-4 py-3 text-left ${selectedId === t.id ? "bg-navy-50" : "hover:bg-navy-50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy">{t.subject}</span>
                        <span className="block text-xs text-muted">{t.category} · {formatDateTime(t.updated_at)}</span>
                      </span>
                      <Badge tone={t.status === "open" ? "green" : "gray"}>{t.status}</Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className={`flex min-h-[26rem] flex-col ${!selectedId ? "hidden lg:flex" : "flex"}`}>
            {!selected ? (
              <div className="grid flex-1 place-items-center p-6">
                <EmptyState title="Select a conversation" description="Choose a message thread to read it." />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-lightgray p-4">
                  <button className="rounded p-1 text-muted hover:bg-navy-50 lg:hidden" onClick={() => setSelectedId(null)} aria-label="Back to conversations">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="truncate font-heading font-bold text-navy">{selected.subject}</h2>
                    <p className="text-xs text-muted">{selected.category} · {selected.status === "open" ? "Open" : "Closed"}</p>
                  </div>
                </div>

                <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-offwhite p-4" aria-live="polite">
                  {loadingMessages ? (
                    <Spinner label="Loading messages…" />
                  ) : messages?.length ? (
                    messages.map((m) => (
                      <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-card ${m.sender_role === "student" ? "ml-auto bg-navy text-white" : "bg-white text-ink"}`}>
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${m.sender_role === "student" ? "text-white/60" : "text-muted"}`}>
                          {m.sender_role === "student" ? "You" : "Academy"} · {formatDateTime(m.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">No messages yet.</p>
                  )}
                </div>

                <form className="flex gap-2 border-t border-lightgray p-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
                  <Input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={selected.status === "closed" ? "This conversation is closed" : "Type your message…"}
                    aria-label="Message"
                    maxLength={2000}
                    disabled={selected.status === "closed"}
                  />
                  <Button type="submit" loading={send.isPending} disabled={selected.status === "closed" || !body.trim()}>
                    <Send className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Send</span>
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <MessagesSquare className="h-3.5 w-3.5" aria-hidden /> Messages are private between you and the academy.
      </p>

      <Modal open={composing} onClose={() => setComposing(false)} title="New message">
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); createThread.mutate(); }}>
          <Field label="Subject" required><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Question about the fee schedule" /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Message" required><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          {formError ? <p className="error-text" role="alert">{formError}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => setComposing(false)}>Cancel</Button>
            <Button type="submit" loading={createThread.isPending}>Send message</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
