import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { useSiteSettings, useSocialLinks } from "@/hooks/useSiteSettings";
import { telLink, waLink } from "@/lib/format";
import Seo from "@/components/site/Seo";
import InquiryForm from "@/components/site/InquiryForm";

export default function Contact() {
  const { data: settings } = useSiteSettings();
  const { data: social } = useSocialLinks();
  const enabledSocial = (social ?? []).filter((s) => s.is_enabled && s.url && s.url !== "#");

  return (
    <>
      <Seo title={`Contact — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description="Contact the academy by phone, WhatsApp, email or visit us. Send an inquiry online." />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Contact Us</h1>
          <p className="mt-2 text-white/75">We're happy to help with course, batch and admission questions.</p>
        </div>
      </div>

      <section className="container-app py-10">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="card p-6">
              <h2 className="font-heading text-lg font-bold">Reach Us</h2>
              <ul className="mt-4 space-y-3.5 text-sm">
                {settings?.address ? (
                  <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /> {settings.address}</li>
                ) : null}
                {settings?.phone ? (
                  <li className="flex items-center gap-3"><Phone className="h-4 w-4 shrink-0 text-problue" aria-hidden />
                    <span>
                      <a href={telLink(settings.phone)} className="hover:underline">{settings.phone}</a>
                      {settings.phone_secondary ? <> · <a href={telLink(settings.phone_secondary)} className="hover:underline">{settings.phone_secondary}</a></> : null}
                    </span>
                  </li>
                ) : null}
                {settings?.whatsapp ? (
                  <li className="flex items-center gap-3"><MessageCircle className="h-4 w-4 shrink-0 text-academy" aria-hidden />
                    <a href={waLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp chat</a>
                  </li>
                ) : null}
                {settings?.email ? (
                  <li className="flex items-center gap-3"><Mail className="h-4 w-4 shrink-0 text-problue" aria-hidden />
                    <a href={`mailto:${settings.email}`} className="hover:underline">{settings.email}</a>
                  </li>
                ) : null}
                {settings?.business_hours ? (
                  <li className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-problue" aria-hidden /> {settings.business_hours}</li>
                ) : null}
              </ul>
              {enabledSocial.length ? (
                <div className="mt-5 border-t border-lightgray pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Follow us</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {enabledSocial.map((s) => (
                      <li key={s.id}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-problue capitalize hover:underline">
                          {s.platform}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-lightgray">
              {settings?.map_url ? (
                <iframe
                  src={settings.map_url}
                  title={`Map showing the location of ${settings.academy_name}`}
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

          <div className="lg:col-span-3">
            <h2 className="mb-4 font-heading text-xl font-bold">Send an Inquiry</h2>
            <InquiryForm sourcePage="/contact" showBatch={false} />
          </div>
        </div>
      </section>
    </>
  );
}
