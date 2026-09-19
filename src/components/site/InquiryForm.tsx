// Public inquiry form used on Admissions, Contact and Course pages.
// Includes a hidden honeypot field for basic spam protection.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { inquirySchema, type InquiryInput } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";

interface Props {
  defaultCourse?: string;
  sourcePage?: string;
  compact?: boolean;
  showBatch?: boolean;
}

export default function InquiryForm({ defaultCourse, sourcePage = "/", compact, showBatch = true }: Props) {
  const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { interested_course: defaultCourse ?? "", preferred_batch: "Any" },
  });

  async function onSubmit(values: InquiryInput) {
    try {
      const utm = new URLSearchParams(window.location.search);
      const { error } = await supabase.from("inquiries").insert({
        name: values.name,
        phone: values.phone,
        whatsapp: values.whatsapp || null,
        email: values.email || null,
        city: values.city || null,
        interested_course: values.interested_course || null,
        preferred_batch: values.preferred_batch || null,
        message: values.message || null,
        source_page: sourcePage,
        utm_source: utm.get("utm_source"),
        utm_medium: utm.get("utm_medium"),
        utm_campaign: utm.get("utm_campaign"),
      });
      if (error) throw error;
      setDone(true);
      reset();
      toast.success("Inquiry submitted! Our team will contact you soon.");
    } catch {
      toast.error("Could not submit the inquiry. Please try again or call us directly.");
    }
  }

  if (done) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center" role="status">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
        <h3 className="font-heading text-lg font-bold text-navy">Inquiry received</h3>
        <p className="max-w-sm text-sm text-muted">Thank you! Our team will reach out to you shortly. If it's urgent, please call the office.</p>
        <Button variant="outline" onClick={() => setDone(false)}>Submit another inquiry</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={compact ? "space-y-4" : "card space-y-4 p-6"} noValidate>
      {/* Honeypot — invisible to humans */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="hp-website">Website</label>
        <input id="hp-website" type="text" tabIndex={-1} autoComplete="off"
          {...register("message" as never, { setValueAs: (v: string) => (document.getElementById("hp-website") as HTMLInputElement)?.value ? "SPAM" : v })}
        />
      </div>

      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <Field label="Applicant Name" required error={errors.name?.message}>
          <Input {...register("name")} autoComplete="name" placeholder="Full name" />
        </Field>
        <Field label="Phone" required error={errors.phone?.message}>
          <Input {...register("phone")} type="tel" autoComplete="tel" placeholder="10-digit mobile number" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="WhatsApp Number" error={errors.whatsapp?.message} hint="If different from phone">
          <Input {...register("whatsapp")} type="tel" placeholder="10-digit WhatsApp number" />
        </Field>
        <Field label="City" error={errors.city?.message}>
          <Input {...register("city")} placeholder="Your city" />
        </Field>
        <Field label="Interested Course" error={errors.interested_course?.message}>
          <Input {...register("interested_course")} placeholder="e.g. NDA Foundation" />
        </Field>
        {showBatch ? (
          <Field label="Preferred Batch" error={errors.preferred_batch?.message}>
            <Input {...register("preferred_batch")} placeholder="Morning / Evening / Any" />
          </Field>
        ) : null}
      </div>
      <Field label="Message" error={errors.message?.message}>
        <Textarea {...register("message")} rows={compact ? 3 : 4} placeholder="Anything you'd like to ask us…" />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm text-ink/90">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-lightgray text-navy focus:ring-problue" {...register("consent")} />
          <span>I agree to be contacted by the academy regarding my inquiry. <span className="text-error">*</span></span>
        </label>
        {errors.consent && <p className="error-text" role="alert">{errors.consent.message}</p>}
      </div>
      <Button type="submit" variant="accent" loading={isSubmitting} className="w-full sm:w-auto">
        Submit Inquiry
      </Button>
    </form>
  );
}
