// Admin Messages: student ↔ academy message threads. Admins can read every
// thread, reply, and close or reopen conversations. Realtime updates are polled
// via React Query so the free tier stays comfortably inside its limits.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, MessagesSquare, CheckCircle2, RotateCcw, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Button, Card, EmptyState, Input, Spinner, Badge } from "@/components/ui";
import type { MessageThread, Message } from "@/types/database";

interface ThreadRow extends MessageThread {
  students?: { full_name: string; student_code: string } | null;
  teachers?: { full_name: string } | null;
}

export default function AdminMessages() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["admin_threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_threads")
        .select("*,students(full_name,student_code),teachers(full_name)")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as ThreadRow[];
    },
    refetchInterval: 30_000,
  });

  const selected = useMemo(() => (threads ?? []).find((t) => t.id === selectedId) ?? null, [threads, selectedId]);

  const { data: messages, isLoading: loadingMsgs } = useQuery({
    queryKey: ["admin_thread_messages", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", selectedId!)
        .order("created_at");
      if (error) throw error;
      return data as Message[];
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Type a message first");
      const { error } = await supabase.from("messages").insert({
        thread_id: selectedId!,
        body: text,
        sender_role: "admin",
      });
      if (error) throw error;
      const { error: e2 } = await supabase.from("message_threads").update({ updated_at: new Date().toISOString() }).eq("id", selectedId!);
      if (e2) throw e2;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["admin_thread_messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["admin_threads"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send the message"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "open" | "closed" }) => {
      const { error } = await supabase.from("message_threads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "closed" ? "Thread closed" : "Thread reopened");
      qc.invalidateQueries({ queryKey: ["admin_threads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Messages</h1>
        <p className="mt-0.5 text-sm text-muted">Conversations started by students. Replies are visible to the student only.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Thread list */}
        <Card className={`overflow-hidden ${selectedId ? "hidden lg:block" : ""}`}>
          {isLoading ? (
            <Spinner label="Loading threads…" />
          ) : !threads?.length ? (
            <div className="p-4">
              <EmptyState title="No conversations" description="Student messages will appear here." />
            </div>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-lightgray overflow-y-auto" aria-label="Conversation list">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-navy-50 ${selectedId === t.id ? "bg-navy-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy">{t.subject}</span>
                        <span className="block truncate text-xs text-muted">
                          {t.students?.full_name ?? "Student"} · {t.students?.student_code ?? ""}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">{formatDateTime(t.updated_at)}</span>
                      </span>
                      <Badge tone={t.status === "open" ? "green" : "gray"}>{t.status}</Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Conversation */}
        <Card className={`flex min-h-[28rem] flex-col ${!selectedId ? "hidden lg:flex" : "flex"}`}>
          {!selected ? (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState title="Select a conversation" description="Choose a thread on the left to read and reply." />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lightgray p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <button className="rounded p-1 text-muted hover:bg-navy-50 lg:hidden" onClick={() => setSelectedId(null)} aria-label="Back to conversations">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="truncate font-heading font-bold text-navy">{selected.subject}</h2>
                    <p className="text-xs text-muted">
                      {selected.students?.full_name ?? "Student"} · {selected.category}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatus.mutate({ id: selected.id, status: selected.status === "open" ? "closed" : "open" })}
                >
                  {selected.status === "open"
                    ? <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Close thread</>
                    : <><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reopen</>}
                </Button>
              </div>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-offwhite p-4" aria-live="polite">
                {loadingMsgs ? (
                  <Spinner label="Loading messages…" />
                ) : messages?.length ? (
                  messages.map((m) => (
                    <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-card ${m.sender_role === "admin" ? "ml-auto bg-navy text-white" : "bg-white text-ink"}`}>
                      <p className="whitespace-pre-line">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.sender_role === "admin" ? "text-white/60" : "text-muted"}`}>
                        {m.sender_role} · {formatDateTime(m.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No messages in this thread yet.</p>
                )}
              </div>

              <form
                className="flex gap-2 border-t border-lightgray p-3"
                onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
              >
                <Input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={selected.status === "closed" ? "This thread is closed — reopen to reply" : "Type your reply…"}
                  aria-label="Reply message"
                  disabled={selected.status === "closed"}
                  maxLength={2000}
                />
                <Button type="submit" loading={send.isPending} disabled={selected.status === "closed" || !body.trim()}>
                  <Send className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <MessagesSquare className="h-3.5 w-3.5" aria-hidden /> Conversations refresh automatically every few seconds.
      </p>
    </div>
  );
}
