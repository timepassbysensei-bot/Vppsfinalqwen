// Student Assignments: published homework for the student's batches, with file
// submission (private bucket, own UID folder) and teacher feedback.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Upload, CheckCircle2, Paperclip, ExternalLink, CalendarDays, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { uploadPrivate, openPrivateFile } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/format";
import { Button, Card, EmptyState, Field, Modal, Spinner, Badge, Textarea } from "@/components/ui";

export default function StudentAssignments() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState<any | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student_assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: student } = await supabase.from("students").select("id").eq("user_id", user!.id).maybeSingle();
      if (!student) return { assignments: [], submissions: [], enrolledBatchIds: [] as string[] };

      const { data: enrollments } = await supabase.from("enrollments").select("batch_id").eq("student_id", student.id).is("left_on", null);
      const batchIds = (enrollments ?? []).map((e: any) => e.batch_id);
      if (!batchIds.length) return { assignments: [], submissions: [], enrolledBatchIds: [] as string[] };

      const [assignments, submissions] = await Promise.all([
        supabase
          .from("assignments")
          .select("*,subjects(name),batches(name),courses(title)")
          .in("batch_id", batchIds)
          .eq("status", "published")
          .order("due_date", { ascending: true }),
        supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", student.id),
      ]);

      return {
        assignments: (assignments.data ?? []) as any[],
        submissions: (submissions.data ?? []) as any[],
        enrolledBatchIds: batchIds,
      };
    },
  });

  const submissionFor = useMemo(() => {
    const map = new Map<string, any>();
    (data?.submissions ?? []).forEach((s) => map.set(s.assignment_id, s));
    return map;
  }, [data?.submissions]);

  const { data: studentId } = useQuery({
    queryKey: ["my_student_id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: student } = await supabase.from("students").select("id").eq("user_id", user!.id).maybeSingle();
      return student?.id ?? null;
    },
  });

  const submit = useMutation({
    mutationFn: async (assignment: any) => {
      if (!studentId) throw new Error("Your login is not linked to a student record yet.");
      if (!file && !note.trim()) throw new Error("Attach a file or write a note before submitting.");
      let path: string | null = null;
      if (file) {
        const res = await uploadPrivate("assignment-submissions", file, user!.id);
        path = res.path;
      }
      const existing = submissionFor.get(assignment.id);
      const payload = {
        assignment_id: assignment.id,
        student_id: studentId,
        file_url: path ?? existing?.file_url ?? null,
        note: note.trim() || existing?.note || null,
        submitted_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("assignment_submissions")
        .upsert(payload, { onConflict: "assignment_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submitted — your teacher will review it.");
      setSubmitting(null);
      setNote("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["student_assignments", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not submit the assignment"),
  });

  async function openFile(path: string) {
    try {
      await openPrivateFile(path.startsWith("http") ? "assignment-files" : "assignment-submissions", path.replace(/^.*assignment-(files|submissions)\//, ""));
    } catch (e: any) {
      toast.error(e.message ?? "Could not open the file");
    }
  }

  if (isLoading) return <Spinner label="Loading assignments…" />;
  if (isError) return <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load assignments."}</div>;

  const assignments = data?.assignments ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Assignments</h1>
        <p className="mt-0.5 text-sm text-muted">Homework and practice work published for your batches.</p>
      </div>

      {!assignments.length ? (
        <EmptyState
          title="No assignments yet"
          description="When your teacher publishes an assignment for your batch, it appears here with the due date."
        />
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const sub = submissionFor.get(a.id);
            const overdue = a.due_date && a.due_date < new Date().toISOString().slice(0, 10) && !sub;
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-heading font-bold text-navy">
                      <ClipboardList className="h-4 w-4 text-problue" aria-hidden />
                      {a.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {a.courses?.title} · {a.batches?.name}
                      {a.subjects?.name ? ` · ${a.subjects.name}` : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Due {formatDate(a.due_date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sub ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" aria-hidden /> Submitted</Badge> : null}
                    {overdue ? <Badge tone="red">Overdue</Badge> : null}
                  </div>
                </div>

                {a.instructions ? (
                  <p className="mt-3 whitespace-pre-line rounded-md bg-offwhite p-3 text-sm text-ink/90">{a.instructions}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {a.attachment_url ? (
                    <Button variant="outline" size="sm" onClick={() => openFile(a.attachment_url)}>
                      <Paperclip className="h-3.5 w-3.5" aria-hidden /> Teacher's attachment
                    </Button>
                  ) : null}
                  {a.external_link ? (
                    <a href={a.external_link} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Reference link
                    </a>
                  ) : null}
                </div>

                {sub ? (
                  <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                    <p className="font-medium text-navy">Your submission · {formatDateTime(sub.submitted_at)}</p>
                    {sub.note ? <p className="mt-1 whitespace-pre-line text-ink/80">{sub.note}</p> : null}
                    {sub.file_url ? (
                      <button onClick={() => openFile(sub.file_url!)} className="mt-2 text-xs font-semibold text-problue underline">
                        Open your uploaded file
                      </button>
                    ) : null}
                    {sub.feedback ? (
                      <p className="mt-3 flex items-start gap-2 rounded bg-white p-2 text-sm">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden />
                        <span><strong>Teacher's feedback:</strong> {sub.feedback}</span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {a.allow_submissions ? (
                  <div className="mt-4 border-t border-lightgray pt-3">
                    <Button
                      size="sm"
                      variant={sub ? "outline" : "primary"}
                      onClick={() => { setSubmitting(a); setNote(sub?.note ?? ""); setFile(null); }}
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden /> {sub ? "Replace submission" : "Submit work"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 border-t border-lightgray pt-3 text-xs text-muted">Submissions are closed for this assignment.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!submitting} onClose={() => setSubmitting(null)} title={`Submit — ${submitting?.title ?? ""}`}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => { e.preventDefault(); if (submitting) submit.mutate(submitting); }}
        >
          <Field label="Your note" hint="Optional — add a short explanation for your teacher">
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field label="Attach a file" hint="PDF, document or image up to 25 MB">
            <input
              type="file"
              className="input py-2"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-label="Choose a file to submit"
            />
          </Field>
          <p className="text-xs text-muted">Your file is stored privately — only you and your teachers can open it.</p>
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => setSubmitting(null)}>Cancel</Button>
            <Button type="submit" loading={submit.isPending}>
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
