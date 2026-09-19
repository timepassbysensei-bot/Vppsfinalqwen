import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Users, GraduationCap, Phone, MessageCircle, FileText, ChevronRight, CalendarDays, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { telLink, waLink } from "@/lib/format";
import Seo from "@/components/site/Seo";
import { Badge, Spinner } from "@/components/ui";
import InquiryForm from "@/components/site/InquiryForm";

export default function CourseDetail() {
  const { slug } = useParams();
  const { data: settings } = useSiteSettings();
  const [showApply, setShowApply] = useState(false);

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["public_course", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .is("archived_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["public_course_batches", course?.id],
    enabled: !!course,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select("id,name,timing,start_date,admission_status")
        .eq("course_id", course!.id)
        .is("archived_at", null)
        .order("start_date");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="container-app py-20"><Spinner label="Loading course…" /></div>;
  if (isError || !course) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="font-heading text-2xl font-bold">Course not found</h1>
        <p className="mt-2 text-sm text-muted">This course may have been unpublished or the link is incorrect.</p>
        <Link to="/courses" className="btn-primary mt-6">Browse all courses</Link>
      </div>
    );
  }

  const phone = settings?.phone;
  const whatsapp = settings?.whatsapp;

  return (
    <>
      <Seo
        title={`${course.title} — ${settings?.academy_name ?? "Bokaro Defence Academy"}`}
        description={course.short_description ?? undefined}
        image={course.thumbnail_url}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: course.short_description ?? undefined,
          provider: { "@type": "EducationalOrganization", name: settings?.academy_name ?? "Bokaro Defence Academy" },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: course.mode,
            courseWorkload: course.duration ?? undefined,
          },
          offers: course.fee_display && course.fee_display !== "Contact for fee"
            ? { "@type": "Offer", price: course.fee_display, priceCurrency: "INR" }
            : undefined,
        }}
      />

      {/* Hero */}
      <div className="bg-navy py-10 text-white">
        <div className="container-app">
          <nav aria-label="Breadcrumb" className="text-xs text-white/60">
            <Link to="/" className="hover:text-white">Home</Link> <ChevronRight className="inline h-3 w-3" aria-hidden />
            <Link to="/courses" className="hover:text-white">Courses</Link> <ChevronRight className="inline h-3 w-3" aria-hidden />
            <span className="text-white/90">{course.title}</span>
          </nav>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={course.admission_status === "open" ? "green" : course.admission_status === "filling_fast" ? "amber" : "red"}>
                  {course.admission_status === "open" ? "Admissions Open" : course.admission_status === "filling_fast" ? "Filling Fast" : "Closed"}
                </Badge>
                <Badge tone="navy">{course.mode}</Badge>
              </div>
              <h1 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl">{course.title}</h1>
              <p className="mt-3 text-white/80">{course.short_description}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
              <button className="btn-accent" onClick={() => setShowApply((v) => !v)}>Apply for this Course</button>
              {phone ? <a className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20" href={telLink(phone)}><Phone className="h-4 w-4" aria-hidden /> Call</a> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container-app grid gap-10 py-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="aspect-[16/9] w-full object-cover" loading="lazy" />
            ) : (
              <div className="grid aspect-[16/9] place-items-center bg-navy-50"><GraduationCap className="h-12 w-12 text-navy-300" aria-hidden /></div>
            )}
          </div>

          <div className="prose-cms mt-8 max-w-none">
            <h2>About this Course</h2>
            <div className="whitespace-pre-line">{course.full_description ?? course.short_description ?? "Full course details will be published here."}</div>
          </div>

          {/* Upcoming batches */}
          <h2 className="mt-10 font-heading text-xl font-bold">Upcoming Batches</h2>
          {batches?.length ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-lightgray">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-offwhite">
                    <tr>
                      <th className="table-th">Batch</th>
                      <th className="table-th">Timing</th>
                      <th className="table-th">Starts</th>
                      <th className="table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lightgray bg-white">
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <td className="table-td font-medium">{b.name}</td>
                        <td className="table-td">{b.timing ?? "—"}</td>
                        <td className="table-td">{b.start_date ? new Date(b.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                        <td className="table-td"><Badge tone={b.admission_status === "open" ? "green" : "amber"}>{b.admission_status === "open" ? "Open" : "Filling fast"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Batch schedules for this course will be announced soon. Contact the office for details.</p>
          )}

          {/* Inline apply form */}
          {showApply ? (
            <div id="apply" className="mt-10">
              <h2 className="font-heading text-xl font-bold">Apply / Inquiry</h2>
              <div className="mt-4"><InquiryForm defaultCourse={course.title} sourcePage={`/courses/${course.slug}`} compact /></div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-muted">Course Information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /><div><dt className="sr-only">Duration</dt><dd><span className="text-muted">Duration:</span> {course.duration ?? "—"}</dd></div></div>
              <div className="flex items-start gap-2.5"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /><div><dt className="sr-only">Eligibility</dt><dd><span className="text-muted">Eligibility:</span> {course.eligibility ?? "—"}</dd></div></div>
              <div className="flex items-start gap-2.5"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /><div><dt className="sr-only">Age criteria</dt><dd><span className="text-muted">Age:</span> {course.age_criteria ?? "—"}</dd></div></div>
              <div className="flex items-start gap-2.5"><Wallet className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /><div><dt className="sr-only">Fee</dt><dd><span className="text-muted">Fee:</span> {course.fee_display ?? "Contact for fee"}</dd></div></div>
              <div className="flex items-start gap-2.5"><Users className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /><div><dt className="sr-only">Seats</dt><dd><span className="text-muted">Seats available:</span> {course.seats_available ?? "—"}</dd></div></div>
              <div className="flex items-start gap-2.5"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /><div><dt className="sr-only">Batch timings</dt><dd><span className="text-muted">Batch timings:</span> {course.batch_timings ?? "—"}</dd></div></div>
            </dl>
            {course.subjects?.length ? (
              <div className="mt-5 border-t border-lightgray pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Subjects Covered</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {course.subjects.map((s: string) => (
                    <li key={s} className="rounded-full bg-navy-50 px-2.5 py-1 text-xs text-navy">{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {course.syllabus_url ? (
              <a href={course.syllabus_url} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm mt-5 w-full justify-center">
                <FileText className="h-4 w-4" aria-hidden /> Download Syllabus
              </a>
            ) : null}
          </div>

          <div className="card p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-muted">Need Help?</h2>
            <div className="mt-3 space-y-2 text-sm">
              {phone ? <a href={telLink(phone)} className="flex items-center gap-2 text-problue hover:underline"><Phone className="h-4 w-4" aria-hidden /> {phone}</a> : null}
              {whatsapp ? <a href={waLink(whatsapp, `Hello, I'm interested in ${course.title}.`)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-academy hover:underline"><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp us</a> : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
