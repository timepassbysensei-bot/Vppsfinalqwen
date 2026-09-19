import { useQuery } from "@tanstack/react-query";
import { Pin, FileText, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { formatDate } from "@/lib/format";
import Seo from "@/components/site/Seo";
import { Badge, EmptyState, Spinner } from "@/components/ui";

export default function Notices() {
  const { data: settings } = useSiteSettings();
  const { data: notices, isLoading } = useQuery({
    queryKey: ["public_notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("id,title,description,publish_date,expiry_date,attachment_url,is_pinned")
        .eq("status", "published")
        .eq("audience", "public")
        .gte("publish_date", "1970-01-01")
        .or(`expiry_date.is.null,expiry_date.gte.${new Date().toISOString().slice(0, 10)}`)
        .order("is_pinned", { ascending: false })
        .order("publish_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <Seo title={`Notices — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description="Official announcements and notices from the academy." />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Notices</h1>
          <p className="mt-2 text-white/75">Official announcements from the academy.</p>
        </div>
      </div>

      <section className="container-app max-w-4xl py-10">
        {isLoading ? (
          <Spinner label="Loading notices…" />
        ) : !notices?.length ? (
          <EmptyState title="No active notices" description="There are currently no published notices. Please check back later." />
        ) : (
          <ul className="space-y-4">
            {notices.map((n: any) => (
              <li key={n.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {n.is_pinned ? <Badge tone="amber"><Pin className="h-3 w-3" aria-hidden /> Pinned</Badge> : null}
                      <Badge tone="gray"><CalendarDays className="h-3 w-3" aria-hidden /> {formatDate(n.publish_date)}</Badge>
                    </div>
                    <h2 className="mt-2 font-heading text-lg font-bold text-navy">{n.title}</h2>
                  </div>
                </div>
                {n.description ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/85">{n.description}</p> : null}
                {n.attachment_url ? (
                  <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm mt-3">
                    <FileText className="h-4 w-4" aria-hidden /> Download Attachment
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
