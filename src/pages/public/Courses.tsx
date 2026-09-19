import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, GraduationCap, Clock, Users, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Seo from "@/components/site/Seo";
import { Badge, EmptyState, Input, Select, Spinner } from "@/components/ui";

export default function Courses() {
  const { data: settings } = useSiteSettings();
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  const modeFilter = params.get("mode") ?? "";
  const statusFilter = params.get("status") ?? "";

  const { data: courses, isLoading } = useQuery({
    queryKey: ["public_courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("status", "published")
        .is("archived_at", null)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    let list = courses ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.short_description?.toLowerCase().includes(q) ||
          c.subjects?.some((s: string) => s.toLowerCase().includes(q)),
      );
    }
    if (modeFilter) list = list.filter((c) => c.mode === modeFilter);
    if (statusFilter) list = list.filter((c) => c.admission_status === statusFilter);
    return list;
  }, [courses, search, modeFilter, statusFilter]);

  const modes = [
    { v: "", label: "All modes" },
    { v: "offline", label: "Offline" },
    { v: "online", label: "Online" },
    { v: "hybrid", label: "Hybrid" },
  ];
  const statuses = [
    { v: "", label: "Any admission status" },
    { v: "open", label: "Admissions open" },
    { v: "filling_fast", label: "Filling fast" },
    { v: "closed", label: "Closed" },
  ];

  return (
    <>
      <Seo title={`Courses — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description="Browse all defence exam coaching courses with eligibility, duration, batch timings and admission status." />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Courses</h1>
          <p className="mt-2 text-white/75">Find the right program for your target examination.</p>
        </div>
      </div>

      <section className="container-app py-10">
        <div className="card mb-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses or subjects…"
              aria-label="Search courses"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={modeFilter} onChange={(e) => setParams(e.target.value ? { mode: e.target.value } : {})} aria-label="Filter by mode" className="w-full sm:w-40">
              {modes.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(e) => setParams({ ...(modeFilter ? { mode: modeFilter } : {}), ...(e.target.value ? { status: e.target.value } : {}) })} aria-label="Filter by admission status" className="w-full sm:w-48">
              {statuses.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Spinner label="Loading courses…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No courses match your filters" description="Try clearing the search or filters, or check back soon — new courses are added regularly." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <article key={c.id} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
                <div className="aspect-[16/9] w-full overflow-hidden bg-navy-50">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center"><GraduationCap className="h-10 w-10 text-navy-300" aria-hidden /></div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={c.admission_status === "open" ? "green" : c.admission_status === "filling_fast" ? "amber" : "red"}>
                      {c.admission_status === "open" ? "Admissions Open" : c.admission_status === "filling_fast" ? "Filling Fast" : "Closed"}
                    </Badge>
                    <Badge tone="navy">{c.mode}</Badge>
                  </div>
                  <h2 className="mt-3 font-heading text-lg font-bold text-navy group-hover:text-problue">
                    <Link to={`/courses/${c.slug}`}>{c.title}</Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{c.short_description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted">
                    <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /><span>{c.duration ?? "—"}</span></div>
                    <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden /><span>{c.seats_available != null ? `${c.seats_available} seats left` : "—"}</span></div>
                    <div className="col-span-2 flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" aria-hidden /><span>{c.eligibility ?? "See details"}</span></div>
                  </dl>
                  <div className="mt-4 flex items-center justify-between border-t border-lightgray pt-4">
                    <span className="text-sm font-semibold text-navy">{c.fee_display ?? "Contact for fee"}</span>
                    <Link to={`/courses/${c.slug}`} className="btn-outline btn-sm">View Details</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
