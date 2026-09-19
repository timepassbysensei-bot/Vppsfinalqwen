import { FileText, Phone, MessageCircle, ClipboardList, CreditCard, GraduationCap } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { telLink, waLink } from "@/lib/format";
import Seo from "@/components/site/Seo";
import InquiryForm from "@/components/site/InquiryForm";

const STEPS = [
  { n: 1, title: "Submit an Inquiry", body: "Fill the inquiry form on this page, call, or message us on WhatsApp with your details and target exam." },
  { n: 2, title: "Counselling Call", body: "Our team contacts you to understand your goals and suggests the right course and batch." },
  { n: 3, title: "Visit & Complete Formalities", body: "Visit the academy with the required documents, confirm your batch, and complete the admission form." },
  { n: 4, title: "Begin Classes", body: "Attend your batch as per the timetable and start your preparation with regular tests and guidance." },
];

const DOCUMENTS = [
  "Recent passport-size photographs (usually 4–6)",
  "Photo ID proof (Aadhaar / school ID)",
  "Latest marksheet or school certificate",
  "Date of birth proof (for age-specific entries)",
  "Any category or scholarship certificates (if applicable)",
];

export default function Admissions() {
  const { data: settings } = useSiteSettings();
  const phone = settings?.phone;
  const whatsapp = settings?.whatsapp;

  return (
    <>
      <Seo title={`Admissions — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description="Admission process, eligibility, required documents and inquiry form for defence exam coaching." />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Admissions</h1>
          <p className="mt-2 text-white/75">{settings?.admission_status_text ?? "Admissions are open — apply online or contact the office."}</p>
        </div>
      </div>

      {/* Process */}
      <section className="container-app py-12">
        <h2 className="text-center text-2xl font-heading font-bold sm:text-3xl">Admission Process</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="card relative p-6">
              <span className="absolute -top-3.5 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-navy font-heading text-sm font-bold text-white" aria-hidden>{s.n}</span>
              <h3 className="font-heading font-bold text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Eligibility + documents */}
      <section className="bg-white py-12">
        <div className="container-app grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-heading font-bold"><GraduationCap className="h-5 w-5 text-problue" aria-hidden /> Eligibility Overview</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Eligibility differs by target examination and entry. As a general guide:
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" aria-hidden /> NDA: Class 11/12 students and 12th pass (age 16½–19½)</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" aria-hidden /> CDS: Graduates and final-year students</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" aria-hidden /> Agniveer: Class 10/12 as per the specific entry</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" aria-hidden /> Exact criteria per course are listed on each course page.</li>
            </ul>
            <p className="mt-4 text-xs text-muted">Please verify the official eligibility criteria for each examination from official notifications before applying.</p>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-xl font-heading font-bold"><ClipboardList className="h-5 w-5 text-problue" aria-hidden /> Required Documents</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {DOCUMENTS.map((d) => (
                <li key={d} className="flex gap-2 rounded-md bg-offwhite px-3 py-2.5">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /> {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Fees note + scholarships */}
      <section className="container-app py-12">
        <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <CreditCard className="h-8 w-8 shrink-0 text-saffron" aria-hidden />
          <div className="flex-1">
            <h2 className="font-heading text-lg font-bold">Fees &amp; Scholarships</h2>
            <p className="mt-1 text-sm text-muted">
              Fee details are shared during counselling because they vary by course and batch duration.
              Ask about available scholarships or discounts for deserving students when you call.
            </p>
          </div>
          {phone ? <a href={telLink(phone)} className="btn-outline shrink-0"><Phone className="h-4 w-4" aria-hidden /> Ask about fees</a> : null}
        </div>
      </section>

      {/* Apply form */}
      <section id="apply" className="bg-offwhite py-12">
        <div className="container-app grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-heading font-bold">Apply for Admission</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Submit the form and our admission team will contact you. Prefer to talk now?
            </p>
            <div className="mt-5 space-y-2.5">
              {phone ? <a href={telLink(phone)} className="btn-primary w-full justify-start"><Phone className="h-4 w-4" aria-hidden /> Call {phone}</a> : null}
              {whatsapp ? (
                <a href={waLink(whatsapp, "Hello, I want admission information.")} target="_blank" rel="noopener noreferrer" className="btn-outline w-full justify-start">
                  <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp us
                </a>
              ) : null}
            </div>
          </div>
          <div className="lg:col-span-3"><InquiryForm sourcePage="/admissions" /></div>
        </div>
      </section>
    </>
  );
}
