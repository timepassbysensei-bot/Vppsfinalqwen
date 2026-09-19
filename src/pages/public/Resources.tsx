import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Link2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Seo from "@/components/site/Seo";
import { Badge, EmptyState, Select, Spinner } from "@/components/ui";

const TYPE_LABELS: Record<string, string> = {
  syllabus: "Syllabus",
  sample_paper: "Sample Papers",
  exam_notification: "Exam Notifications",
  study_tips: "Study Tips",
  prospectus: "Prospectus",
  useful_link: "Useful Links",
};

export default function Resources() {
  const { data: settings } = useSiteSettings();
  const [type, setType] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["public_resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_resources")
        .select("*")
        .eq("status", "published")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = type ? (items ?? []).filter((r: any) => r.resource_type === type) : items ?? [];

  return (
    <>
      <Seo title={`Resources — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description="Free study resources: syllabus, sample papers, exam notifications and study tips." />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Student Resources</h1>
          <p className="mt-2 text-white/75">Free downloads and useful links for aspirants.</p>
        </div>
      </div>

      <section className="container-app max-w-4xl py-10">
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter resources by type" className="mb-6 sm:w-64">
          <option value="">All resource types</option>
          {Object.entries(TYPE_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </Select>

        {isLoading ? (
          <Spinner label="Loading resources…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No resources published yet" description="Study materials and downloads will appear here as the academy publishes them." />
        ) : (
          <ul className="space-y-3">
            {filtered.map((r: any) => (
              <li key={r.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="navy">{TYPE_LABELS[r.resource_type] ?? r.resource_type}</Badge>
                  </div>
                  <h2 className="mt-2 font-heading font-bold text-navy">{r.title}</h2>
                  {r.description ? <p className="mt-1 text-sm text-muted">{r.description}</p> : null}
                </div>
                <div className="shrink-0">
                  {r.file_url ? (
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                      <Download className="h-4 w-4" aria-hidden /> Download
                    </a>
                  ) : r.external_link ? (
                    <a href={r.external_link} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                      <Link2 className="h-4 w-4" aria-hidden /> Open Link
                    </a>
                  ) : (
                    <span className="text-xs text-muted"><FileText className="inline h-3.5 w-3.5" aria-hidden /> Coming soon</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
