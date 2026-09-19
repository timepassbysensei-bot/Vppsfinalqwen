import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { maskName } from "@/lib/format";
import Seo from "@/components/site/Seo";
import { Badge, EmptyState, Input, Select, Spinner } from "@/components/ui";

export default function Results() {
  const { data: settings } = useSiteSettings();
  const [year, setYear] = useState("");
  const [exam, setExam] = useState("");
  const [course, setCourse] = useState("");
  const [q, setQ] = useState("");

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["public_results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id,student_name,photo_url,examination,rank_display,year,description,course_id,consent_recorded")
        .eq("status", "published")
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["public_courses_light"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id,title").eq("status", "published").order("title");
      return data ?? [];
    },
  });

  const years = useMemo(
    () => Array.from(new Set((achievements ?? []).map((a: any) => a.year))).sort().reverse(),
    [achievements],
  );
  const exams = useMemo(
    () => Array.from(new Set((achievements ?? []).map((a: any) => a.examination))).sort(),
    [achievements],
  );

  const filtered = useMemo(() => {
    let list = achievements ?? [];
    if (year) list = list.filter((a: any) => String(a.year) === year);
    if (exam) list = list.filter((a: any) => a.examination === exam);
    if (course) list = list.filter((a: any) => a.course_id === course);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((a: any) =>
        a.student_name.toLowerCase().includes(s) || a.examination.toLowerCase().includes(s),
      );
    }
    return list;
  }, [achievements, year, exam, course, q]);

  return (
    <>
      <Seo title={`Results — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description="Student achievements and examination results, published with consent." />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Results &amp; Achievements</h1>
          <p className="mt-2 text-white/75">Published with student consent. Names or photographs may be partially hidden where consent was not recorded.</p>
        </div>
      </div>

      <section className="container-app py-10">
        <div className="card mb-8 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by year">
            <option value="">All years</option>
            {years.map((y: any) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Filter by examination">
            <option value="">All examinations</option>
            {exams.map((e: any) => <option key={e} value={e}>{e}</option>)}
          </Select>
          <Select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter by course">
            <option value="">All courses</option>
            {(courses ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or exam…" aria-label="Search results" />
        </div>

        {isLoading ? (
          <Spinner label="Loading results…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No published results yet"
            description="Results are published here after verification and student consent. If you're looking for older records, please contact the office."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a: any) => (
              <article key={a.id} className="card flex gap-4 p-5">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-navy-50">
                  {a.consent_recorded && a.photo_url ? (
                    <img src={a.photo_url} alt={a.student_name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center"><Trophy className="h-6 w-6 text-navy-300" aria-hidden /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="navy">{a.year}</Badge>
                    {!a.consent_recorded ? <Badge tone="gray"><ShieldAlert className="h-3 w-3" aria-hidden /> Name shortened</Badge> : null}
                  </div>
                  <h2 className="mt-1.5 font-heading font-bold text-navy">{a.examination}</h2>
                  <p className="text-sm text-ink/90">
                    <span className="font-semibold">{a.consent_recorded ? a.student_name : maskName(a.student_name)}</span>
                    {" — "}{a.rank_display}
                  </p>
                  {a.description ? <p className="mt-1 text-xs text-muted">{a.description}</p> : null}
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="mt-8 text-center text-xs text-muted">
          Note: Only results explicitly published and consented to by students appear here. Sample/placeholder entries are labeled as such.
        </p>
      </section>
    </>
  );
}
