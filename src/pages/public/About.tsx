import { useQuery } from "@tanstack/react-query";
import { BookOpen, Target, Eye, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Seo from "@/components/site/Seo";

export default function About() {
  const { data: settings } = useSiteSettings();
  // Editable copy managed in Admin → Website Content (falls back to a placeholder).
  const { data: contentSections } = useQuery({
    queryKey: ["public_page_sections", "about"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_sections")
        .select("section_key,heading,body,image_url,image_position")
        .eq("page_key", "about");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((s: any) => [s.section_key, s]));
    },
  });

  const { data: faculty } = useQuery({
    queryKey: ["public_faculty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faculty_profiles")
        .select("id,name,designation,subject_area,photo_url,bio")
        .eq("is_published", true)
        .is("archived_at", null)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <Seo title={`About — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description={settings?.about_overview ?? undefined} />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">About Us</h1>
          <p className="mt-2 max-w-2xl text-white/75">{settings?.tagline}</p>
        </div>
      </div>

      <section className="container-app py-12">
        <div className="prose-cms max-w-none">
          <h2>Academy Overview</h2>
          <p>{settings?.about_overview ?? "Academy overview will be published here once added by the academy."}</p>

          <h2>Our History</h2>
          <p>{settings?.about_history ?? "Academy history will be published here once added."}</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <Target className="h-6 w-6 text-problue" aria-hidden />
            <h3 className="mt-3 font-heading text-lg font-bold">Our Mission</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{settings?.mission ?? "Mission statement will be published here."}</p>
          </div>
          <div className="card p-6">
            <Eye className="h-6 w-6 text-problue" aria-hidden />
            <h3 className="mt-3 font-heading text-lg font-bold">Our Vision</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{settings?.vision ?? "Vision statement will be published here."}</p>
          </div>
        </div>

        <div className="prose-cms mt-12 max-w-none">
          <h2>Teaching Approach</h2>
          <p>{settings?.teaching_approach ?? "Teaching approach details will be published here."}</p>
        </div>

        <div className="mt-12">
          <h2 className="font-heading text-2xl font-bold">Director's Message</h2>
          <div className="card mt-4 flex flex-col gap-6 p-6 sm:flex-row">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-navy-50">
              {settings?.directors_photo_url ? (
                <img src={settings.directors_photo_url} alt="Director" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-navy-300"><BookOpen className="h-8 w-8" aria-hidden /></div>
              )}
            </div>
            <div>
              <blockquote className="text-sm leading-relaxed text-ink/90">
                {settings?.directors_message ? `"${settings.directors_message}"` : "The director's message will be published here."}
              </blockquote>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-heading text-2xl font-bold">Our Faculty</h2>
          {faculty?.length ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {faculty.map((f) => (
                <div key={f.id} className="card overflow-hidden">
                  <div className="flex items-center gap-4 p-5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-navy-50">
                      {f.photo_url ? (
                        <img src={f.photo_url} alt={f.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="grid h-full place-items-center font-heading font-bold text-navy-400">
                          {f.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-navy">{f.name}</h3>
                      <p className="text-xs text-muted">{f.designation ?? f.subject_area}</p>
                    </div>
                  </div>
                  {f.bio ? <p className="px-5 pb-5 text-sm text-muted">{f.bio}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Faculty profiles will be published here.</p>
          )}
        </div>

        <div className="mt-12 card p-6">
          <ClipboardList className="h-6 w-6 text-problue" aria-hidden />
          <h2 className="mt-3 font-heading text-xl font-bold">
            {contentSections?.facilities?.heading ?? "Facilities"}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {contentSections?.facilities?.body ??
              "Details about classrooms, library, training grounds and other facilities will be published here. Academy staff can add this content from Admin → Website Content → About."}
          </p>
          {contentSections?.facilities?.image_url ? (
            <img
              src={contentSections.facilities.image_url}
              alt=""
              loading="lazy"
              className="mt-4 h-56 w-full rounded-md object-cover"
              style={{ objectPosition: contentSections.facilities.image_position ?? "center" }}
            />
          ) : null}
        </div>

        {contentSections?.why_us?.body ? (
          <div className="prose-cms mt-12 max-w-none">
            <h2>{contentSections.why_us.heading ?? "Why choose us"}</h2>
            <p className="whitespace-pre-line">{contentSections.why_us.body}</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
