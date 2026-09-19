// Student Resources: published study material for the student's course/batch.
// Files live in a private bucket and open through short-lived signed URLs.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderOpen, Search, FileText, Link2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { openPrivateFile } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { Card, EmptyState, Input, Select, Spinner, Badge } from "@/components/ui";

const TYPES: Record<string, string> = {
  study_material: "Study material",
  syllabus: "Syllabus",
  notes: "Class notes",
  practice_paper: "Practice paper",
  video: "Video / link",
  other: "Other",
};

export default function StudentResources() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: resources, isLoading, isError, error } = useQuery({
    queryKey: ["student_resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*,subjects(name),courses(title),batches(name)")
        .eq("visibility", "published")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const types = useMemo(() => Array.from(new Set((resources ?? []).map((r) => r.resource_type))), [resources]);

  const filtered = useMemo(() => (resources ?? []).filter((r) => {
    if (type && r.resource_type !== type) return false;
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return r.title.toLowerCase().includes(t) || (r.description ?? "").toLowerCase().includes(t);
  }), [resources, q, type]);

  async function open(r: any) {
    if (r.external_link) {
      window.open(r.external_link, "_blank", "noopener,noreferrer");
      return;
    }
    if (!r.file_url) {
      toast.error("This resource has no file attached yet. Please contact the office.");
      return;
    }
    setBusy(r.id);
    try {
      await openPrivateFile("student-resources", r.file_url);
    } catch (e: any) {
      toast.error(e.message ?? "Could not open the file");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <Spinner label="Loading resources…" />;
  if (isError) return <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load resources."}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Study Resources</h1>
        <p className="mt-0.5 text-sm text-muted">Material shared for your course and batch.</p>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources…" className="pl-9" aria-label="Search resources" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{TYPES[t] ?? t}</option>)}
        </Select>
      </Card>

      {!filtered.length ? (
        <EmptyState
          title="No resources available"
          description="When your teachers share syllabi, notes or practice papers for your batch, they appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((r) => (
            <Card key={r.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex items-center gap-2 font-heading font-bold text-navy">
                  {r.external_link ? <Link2 className="h-4 w-4 text-problue" aria-hidden /> : <FileText className="h-4 w-4 text-problue" aria-hidden />}
                  {r.title}
                </h2>
                <Badge tone="navy">{TYPES[r.resource_type] ?? r.resource_type}</Badge>
              </div>
              {r.description ? <p className="mt-2 flex-1 text-sm text-ink/90">{r.description}</p> : <div className="flex-1" />}
              <p className="mt-2 text-xs text-muted">
                {[r.courses?.title, r.batches?.name, r.subjects?.name].filter(Boolean).join(" · ") || "All students"} · {formatDate(r.created_at)}
              </p>
              <div className="mt-4 border-t border-lightgray pt-3">
                <button
                  onClick={() => open(r)}
                  disabled={busy === r.id}
                  className="btn-outline btn-sm disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {busy === r.id ? "Opening…" : r.external_link ? "Open link" : "View file"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <FolderOpen className="h-3.5 w-3.5" aria-hidden /> Files open in a new tab using a secure, temporary link.
      </p>
    </div>
  );
}
