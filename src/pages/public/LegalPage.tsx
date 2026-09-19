// Shared legal-page template. Content comes from page_sections (page_key = 'legal'),
// editable in Admin → Website Content → Policies. Falls back to neutral placeholders.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Seo from "@/components/site/Seo";

export function LegalPage({ pageKey, title, fallback }: { pageKey: string; title: string; fallback: string }) {
  const { data: settings } = useSiteSettings();
  const { data: section } = useQuery({
    queryKey: ["legal_section", pageKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("page_sections")
        .select("body,updated_at")
        .eq("page_key", "legal")
        .eq("section_key", pageKey)
        .maybeSingle();
      return data;
    },
  });

  const content = section?.body || fallback;

  return (
    <>
      <Seo title={`${title} — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description={`${title} of ${settings?.academy_name ?? "the academy"}.`} />
      <div className="bg-navy py-12 text-white">
        <div className="container-app"><h1 className="font-heading text-3xl font-extrabold sm:text-4xl">{title}</h1></div>
      </div>
      <section className="container-app max-w-3xl py-10">
        <div className="prose-cms card whitespace-pre-line p-6 sm:p-8">{content}</div>
      </section>
    </>
  );
}

export default LegalPage;
