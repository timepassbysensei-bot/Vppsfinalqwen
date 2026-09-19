// Student Results: published tests for the student's batches, with a per-subject
// breakdown computed server-side by the `test_results` RPC. A missing entry is
// shown as "Not entered" — never as zero.
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FileSpreadsheet, ChevronRight, GraduationCap, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Spinner, Badge } from "@/components/ui";

interface ResultSubject {
  subject_name: string;
  max_marks: number;
  passing_marks: number;
  marks: number | null;
  is_absent: boolean;
  feedback: string | null;
}

interface TestResult {
  subjects: ResultSubject[];
  total: number | null;
  max_total: number;
  show_rank: boolean;
}

export default function StudentResults() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("test");

  const { data: tests, isLoading, isError, error } = useQuery({
    queryKey: ["student_tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id,name,test_date,test_type,status,show_rank,batches(name),courses(title)")
        .in("status", ["published", "locked"])
        .order("test_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    if (!selectedId && tests?.length) setParams({ test: tests[0].id }, { replace: true });
  }, [selectedId, tests, setParams]);

  const selected = useMemo(() => (tests ?? []).find((t) => t.id === selectedId) ?? null, [tests, selectedId]);

  const { data: result, isLoading: loadingResult, isError: resultError } = useQuery({
    queryKey: ["student_test_result", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("test_results", { p_test_id: selectedId! });
      if (error) throw error;
      return data as unknown as TestResult;
    },
  });

  const percentage = result && result.total !== null && result.max_total > 0
    ? Math.round((result.total / result.max_total) * 1000) / 10
    : null;

  const passed = useMemo(() => {
    if (!result) return null;
    if (result.subjects.some((s) => s.is_absent)) return false;
    if (result.subjects.some((s) => s.marks === null)) return null;
    return result.subjects.every((s) => (s.marks ?? 0) >= s.passing_marks);
  }, [result]);

  if (isLoading) return <Spinner label="Loading your results…" />;
  if (isError) return <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load results."}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Results</h1>
        <p className="mt-0.5 text-sm text-muted">Marks published by your teachers. Results are published only after review.</p>
      </div>

      {!tests?.length ? (
        <EmptyState
          title="No results published yet"
          description="When a test is reviewed and published by your teacher, your marks appear here."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          {/* Test list */}
          <Card className="p-2">
            <ul className="divide-y divide-lightgray" aria-label="Published tests">
              {tests.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setParams({ test: t.id })}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-3 text-left ${selectedId === t.id ? "bg-navy-50" : "hover:bg-navy-50"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-navy">{t.name}</span>
                      <span className="block text-xs text-muted">{formatDate(t.test_date)} · {t.batches?.name}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Result detail */}
          <Card className="p-5">
            {!selected ? (
              <EmptyState title="Select a test" description="Choose a published test to see your marks." />
            ) : loadingResult ? (
              <Spinner label="Loading your marks…" />
            ) : resultError || !result ? (
              <EmptyState title="Marks not available" description="Your marks for this test may not be entered yet. Please check again later." />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-bold text-navy">{selected.name}</h2>
                    <p className="text-sm text-muted">
                      {selected.courses?.title} · {selected.batches?.name} · {formatDate(selected.test_date)}
                    </p>
                  </div>
                  <Badge tone={passed === null ? "amber" : passed ? "green" : "red"}>
                    {passed === null ? "Incomplete" : passed ? "Passed" : "Needs improvement"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-navy-50 p-3">
                    <p className="text-xs text-muted">Total</p>
                    <p className="font-heading text-xl font-bold text-navy">
                      {result.total !== null ? `${result.total} / ${result.max_total}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-md bg-navy-50 p-3">
                    <p className="text-xs text-muted">Percentage</p>
                    <p className="font-heading text-xl font-bold text-navy">{percentage !== null ? `${percentage}%` : "—"}</p>
                  </div>
                  <div className="rounded-md bg-navy-50 p-3">
                    <p className="text-xs text-muted">Rank</p>
                    <p className="font-heading text-xl font-bold text-navy">
                      {result.show_rank ? "Shared" : "Not published"}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-offwhite">
                      <tr>
                        <th className="table-th">Subject</th>
                        <th className="table-th">Marks</th>
                        <th className="table-th">Max</th>
                        <th className="table-th">Pass mark</th>
                        <th className="table-th">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-lightgray">
                      {result.subjects.map((s, i) => (
                        <tr key={`${s.subject_name}-${i}`}>
                          <td className="table-td font-medium text-navy">{s.subject_name}</td>
                          <td className="table-td">{s.is_absent ? "Absent" : s.marks ?? "Not entered"}</td>
                          <td className="table-td">{s.max_marks}</td>
                          <td className="table-td">{s.passing_marks}</td>
                          <td className="table-td">
                            {s.is_absent ? <Badge tone="red">Absent</Badge>
                              : s.marks === null ? <Badge tone="amber">Pending</Badge>
                              : s.marks >= s.passing_marks ? <Badge tone="green">Pass</Badge>
                              : <Badge tone="red">Fail</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.subjects.some((s) => s.feedback) ? (
                  <div className="space-y-2">
                    <h3 className="font-heading font-semibold text-navy">Teacher feedback</h3>
                    {result.subjects.filter((s) => s.feedback).map((s, i) => (
                      <p key={i} className="rounded-md bg-offwhite p-3 text-sm">
                        <strong>{s.subject_name}:</strong> {s.feedback}
                      </p>
                    ))}
                  </div>
                ) : null}

                <p className="flex items-start gap-2 rounded-md bg-navy-50 p-3 text-xs text-navy">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  If a mark looks wrong, speak to your teacher. Published results can only be corrected by an administrator and every change is logged.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>Close detail</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden /> Only results your teachers have published are visible here.
        <GraduationCap className="h-3.5 w-3.5" aria-hidden />
      </p>
    </div>
  );
}
