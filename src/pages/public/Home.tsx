// Home page — all copy comes from site_settings / DB; nothing is hard-coded beyond fallbacks.
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Phone, MessageCircle, GraduationCap, Users, Trophy, CalendarDays,
  ChevronRight, Star, MapPin, BookOpen, Dumbbell, ClipboardCheck, ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { telLink, waLink, formatDate } from "@/lib/format";
import Seo from "@/components/site/Seo";
import { Badge } from "@/components/ui";

export default function Home() {
  const { data: settings } = useSiteSettings();

  const { data: courses } = useQuery({
    queryKey: ["public_courses_featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,slug,short_description,thumbnail_url,duration,eligibility,fee_display,mode,admission_status,subjects,is_featured,batch_timings")
        .eq("status", "published")
        .is("archived_at", null)
        .order("display_order")
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: achievements } = useQuery({
    queryKey: ["public_achievements_featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id,student_name,photo_url,examination,rank_display,year,course_id,description,consent_recorded")
        .eq("status", "published")
        .order("year", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
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
        .order("display_order")
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonials } = useQuery({
    queryKey: ["public_testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("id,name,photo_url,course,quote,rating")
        .eq("is_approved", true)
        .order("is_featured", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: albums } = useQuery({
    queryKey: ["public_gallery_preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_albums")
        .select("id,title,cover_url,event_date,category")
        .eq("status", "published")
        .is("archived_at", null)
        .order("display_order")
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: notices } = useQuery({
    queryKey: ["public_notices_preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("id,title,publish_date,description,is_pinned")
        .eq("status", "published")
        .eq("audience", "public")
        .order("is_pinned", { ascending: false })
        .order("publish_date", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: faqs } = useQuery({
    queryKey: ["public_faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_faqs")
        .select("id,question,answer")
        .eq("is_published", true)
        .is("archived_at", null)
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const admissionOpen = settings?.admission_status_text || "Admissions Open";
  const phone = settings?.phone;
  const whatsapp = settings?.whatsapp;

  const stats = [
    { icon: GraduationCap, label: "Courses Offered", value: courses?.length ? `${courses.length}+` : "—" },
    { icon: Users, label: "Small Batches", value: "Personal Attention" },
    { icon: Trophy, label: "Published Results", value: achievements?.length ? String(achievements.length) : "—" },
    { icon: CalendarDays, label: "Regular Testing", value: "Weekly & Monthly" },
  ];

  const whyUs = [
    { icon: BookOpen, title: "Structured Syllabus Coverage", body: "Complete syllabus completed well before the exam, followed by revision cycles and full-length practice." },
    { icon: ClipboardCheck, title: "Regular Tests & Feedback", body: "Weekly tests, monthly tests and mock exams with individual feedback so students know exactly where they stand." },
    { icon: Dumbbell, title: "Physical Fitness Training", body: "Defence careers demand fitness. Regular outdoor sessions build the endurance the selection process expects." },
    { icon: Users, title: "Small, Focused Batches", body: "Limited seats per batch so every student gets personal attention and doubt-clearing support." },
  ];

  return (
    <>
      <Seo
        title={`${settings?.academy_name ?? "Bokaro Defence Academy"} — Defence Exam Coaching`}
        description={settings?.seo_description ?? "Disciplined coaching for NDA, CDS, AFCAT and Agniveer aspirants."}
        image={settings?.og_image_url}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: settings?.academy_name ?? "Bokaro Defence Academy",
          description: settings?.seo_description ?? undefined,
          telephone: phone ?? undefined,
          email: settings?.email ?? undefined,
          address: settings?.address ? { "@type": "PostalAddress", streetAddress: settings.address } : undefined,
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-dark text-white">
        {settings?.hero_image_url ? (
          <img
            src={settings.hero_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
            style={{ objectPosition: settings.hero_image_position ?? "center" }}
            loading="eager"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy-dark/85 to-navy/40" aria-hidden />
        <div className="container-app relative py-16 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <span className="badge bg-saffron/15 text-saffron-200 ring-1 ring-saffron/40">
              {admissionOpen}
            </span>
            <h1 className="mt-4 font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              {settings?.hero_heading ?? "Prepare with discipline. Serve with honour."}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              {settings?.hero_description ?? "Structured coaching for defence examinations with regular tests, physical training and personal guidance."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {settings?.hero_primary_label ? (
                <Link to={settings.hero_primary_href ?? "/admissions"} className="btn-accent">
                  {settings.hero_primary_label} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
              {settings?.hero_secondary_label ? (
                <Link to={settings.hero_secondary_href ?? "/courses"} className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20">
                  {settings.hero_secondary_label}
                </Link>
              ) : null}
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              {phone ? (
                <a href={telLink(phone)} className="flex items-center gap-2 text-white/85 hover:text-white">
                  <Phone className="h-4 w-4 text-saffron" aria-hidden /> {phone}
                </a>
              ) : null}
              {whatsapp ? (
                <a href={waLink(whatsapp, "Hello, I want to know about admission.")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/85 hover:text-white">
                  <MessageCircle className="h-4 w-4 text-saffron" aria-hidden /> WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Trust statistics */}
      <section className="border-b border-lightgray bg-white">
        <div className="container-app grid grid-cols-2 gap-4 py-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg bg-offwhite px-4 py-5 text-center">
              <s.icon className="h-6 w-6 text-problue" aria-hidden />
              <span className="font-heading text-xl font-bold text-navy">{s.value}</span>
              <span className="text-xs text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section className="container-app py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-bold sm:text-3xl">Our Courses</h2>
            <p className="mt-1 text-sm text-muted">Focused programs for each defence examination.</p>
          </div>
          <Link to="/courses" className="hidden items-center gap-1 text-sm font-semibold text-problue hover:underline sm:flex">
            All courses <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((c) => (
            <Link key={c.id} to={`/courses/${c.slug}`} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
              <div className="aspect-[16/9] w-full overflow-hidden bg-navy-50">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <GraduationCap className="h-10 w-10 text-navy-300" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2">
                  <Badge tone={c.admission_status === "open" ? "green" : c.admission_status === "filling_fast" ? "amber" : "red"}>
                    {c.admission_status === "open" ? "Admissions Open" : c.admission_status === "filling_fast" ? "Filling Fast" : "Admissions Closed"}
                  </Badge>
                  <span className="text-xs uppercase tracking-wide text-muted">{c.mode}</span>
                </div>
                <h3 className="mt-3 font-heading text-lg font-bold text-navy group-hover:text-problue">{c.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{c.short_description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span>{c.duration ?? "Duration on request"}</span>
                  <span>{c.fee_display ?? "Contact for fee"}</span>
                </div>
              </div>
            </Link>
          ))}
          {!courses?.length ? (
            <p className="col-span-full py-8 text-center text-sm text-muted">Course information will be published here soon. Please contact the office.</p>
          ) : null}
        </div>
      </section>

      {/* About preview */}
      <section className="bg-white py-14">
        <div className="container-app grid items-center gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-lightgray">
            {settings?.hero_image_url ? (
              <img src={settings.hero_image_url} alt={`Inside ${settings?.academy_name ?? "the academy"}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center bg-navy-50">
                <GraduationCap className="h-12 w-12 text-navy-300" aria-hidden />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold sm:text-3xl">About the Academy</h2>
            <p className="mt-4 leading-relaxed text-ink/85">
              {settings?.about_overview ?? "Information about the academy will be published here. Academy staff can add it from the admin dashboard."}
            </p>
            <Link to="/about" className="mt-6 inline-flex items-center gap-1 font-semibold text-problue hover:underline">
              Learn more about us <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="container-app py-14">
        <h2 className="text-center text-2xl font-heading font-bold sm:text-3xl">Why Choose Us</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyUs.map((w) => (
            <div key={w.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-50 text-problue">
                <w.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading font-bold text-navy">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming batches / admission notice */}
      <section className="bg-navy py-14 text-white">
        <div className="container-app">
          <h2 className="text-2xl font-heading font-bold sm:text-3xl">Admission Updates</h2>
          <p className="mt-1 text-sm text-white/70">{admissionOpen} — contact the office for batch details and seat availability.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(courses ?? []).slice(0, 3).map((c) => (
              <div key={c.id} className="rounded-lg border border-white/15 bg-white/5 p-5">
                <h3 className="font-heading font-semibold">{c.title}</h3>
                <p className="mt-1 text-xs text-white/60">{c.batch_timings ?? "Batch timings on request"}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`badge ${c.admission_status === "open" ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"}`}>
                    {c.admission_status === "open" ? "Intake open" : "Filling fast"}
                  </span>
                  <Link to={`/courses/${c.slug}`} className="text-xs font-semibold text-saffron-200 hover:text-saffron">
                    Details <ChevronRight className="inline h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      {(achievements ?? []).length > 0 ? (
        <section className="container-app py-14">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-heading font-bold sm:text-3xl">Achievements</h2>
            <Link to="/results" className="hidden items-center gap-1 text-sm font-semibold text-problue hover:underline sm:flex">
              All results <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {achievements!.map((a) => (
              <div key={a.id} className="card p-5">
                <Trophy className="h-6 w-6 text-saffron" aria-hidden />
                <h3 className="mt-3 font-heading font-bold text-navy">{a.examination} {a.year}</h3>
                <p className="mt-1 text-sm text-ink/90">
                  <span className="font-semibold">{a.consent_recorded ? a.student_name : a.student_name.split(" ")[0] + " (name withheld)"}</span>
                  {" — "}{a.rank_display}
                </p>
                {a.description ? <p className="mt-2 text-xs text-muted">{a.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Faculty preview */}
      {(faculty ?? []).length > 0 ? (
        <section className="bg-white py-14">
          <div className="container-app">
            <h2 className="text-2xl font-heading font-bold sm:text-3xl">Our Faculty</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {faculty!.map((f) => (
                <div key={f.id} className="card overflow-hidden text-center">
                  <div className="mx-auto mt-6 h-20 w-20 overflow-hidden rounded-full bg-navy-50">
                    {f.photo_url ? (
                      <img src={f.photo_url} alt={f.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center font-heading text-xl font-bold text-navy-400">
                        {f.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading font-semibold text-navy">{f.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">{f.designation ?? f.subject_area}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Testimonials */}
      {(testimonials ?? []).length > 0 ? (
        <section className="container-app py-14">
          <h2 className="text-2xl font-heading font-bold sm:text-3xl">What Students Say</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials!.map((t) => (
              <figure key={t.id} className="card p-6">
                <div className="flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-saffron text-saffron" : "text-lightgray"}`} aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-ink/90">"{t.quote}"</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-navy">{t.name}</span>
                  {t.course ? <span className="text-muted"> · {t.course}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Gallery preview */}
      {(albums ?? []).length > 0 ? (
        <section className="bg-white py-14">
          <div className="container-app">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-heading font-bold sm:text-3xl">Gallery</h2>
              <Link to="/gallery" className="hidden items-center gap-1 text-sm font-semibold text-problue hover:underline sm:flex">
                View gallery <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {albums!.map((g) => (
                <Link key={g.id} to="/gallery" className="group overflow-hidden rounded-lg">
                  <div className="aspect-square overflow-hidden bg-navy-50">
                    {g.cover_url ? (
                      <img src={g.cover_url} alt={g.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-navy-300"><BookOpen className="h-8 w-8" aria-hidden /></div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-navy">{g.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Notices */}
      {(notices ?? []).length > 0 ? (
        <section className="container-app py-14">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-heading font-bold sm:text-3xl">Latest Notices</h2>
            <Link to="/notices" className="hidden items-center gap-1 text-sm font-semibold text-problue hover:underline sm:flex">
              All notices <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-8 space-y-3">
            {notices!.map((n) => (
              <li key={n.id} className="card flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-problue">
                  {n.is_pinned ? <Trophy className="h-5 w-5" aria-hidden /> : <CalendarDays className="h-5 w-5" aria-hidden />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{n.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted">{n.description}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(n.publish_date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* FAQs */}
      {(faqs ?? []).length > 0 ? (
        <section className="bg-white py-14">
          <div className="container-app max-w-3xl">
            <h2 className="text-center text-2xl font-heading font-bold sm:text-3xl">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-3">
              {faqs!.map((f) => (
                <details key={f.id} className="group rounded-lg border border-lightgray bg-white p-4">
                  <summary className="cursor-pointer list-none font-semibold text-navy marker:hidden">
                    {f.question}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Inquiry CTA */}
      <section className="bg-saffron-50 py-14">
        <div className="container-app text-center">
          <h2 className="text-2xl font-heading font-bold text-navy sm:text-3xl">Ready to begin your preparation?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink/80">
            Apply online or talk to us directly — we'll guide you to the right course and batch.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/admissions#apply" className="btn-primary">Apply Now</Link>
            {phone ? <a href={telLink(phone)} className="btn-outline"><Phone className="h-4 w-4" aria-hidden /> Call Now</a> : null}
            {whatsapp ? <a href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer" className="btn-outline"><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp</a> : null}
          </div>
        </div>
      </section>

      {/* Contact & map */}
      <section className="container-app py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-heading font-bold sm:text-3xl">Visit or Contact Us</h2>
            <ul className="mt-6 space-y-3 text-sm">
              {settings?.address ? (
                <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /> {settings.address}</li>
              ) : null}
              {phone ? (
                <li className="flex items-center gap-3"><Phone className="h-4 w-4 shrink-0 text-problue" aria-hidden /> <a href={telLink(phone)} className="hover:underline">{phone}</a></li>
              ) : null}
              {settings?.email ? (
                <li className="flex items-center gap-3"><BookOpen className="h-4 w-4 shrink-0 text-problue" aria-hidden /> <a href={`mailto:${settings.email}`} className="hover:underline">{settings.email}</a></li>
              ) : null}
              {settings?.business_hours ? (
                <li className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /> {settings.business_hours}</li>
              ) : null}
            </ul>
          </div>
          <div className="overflow-hidden rounded-lg border border-lightgray">
            {settings?.map_url ? (
              <iframe
                src={settings.map_url}
                title={`Map showing ${settings?.academy_name ?? "the academy"} location`}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="grid h-72 place-items-center bg-navy-50 text-sm text-muted">
                Map will appear here once configured in Site Settings.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
