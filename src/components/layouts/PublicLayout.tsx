// Public site layout: header, announcement bar, mobile drawer, footer, floating actions, chatbot.
import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, Phone, MessageCircle, ShieldCheck } from "lucide-react";
import { useSiteSettings, useSocialLinks } from "@/hooks/useSiteSettings";
import { telLink, waLink } from "@/lib/format";
import ChatbotWidget from "@/components/site/ChatbotWidget";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/courses", label: "Courses" },
  { to: "/admissions", label: "Admissions" },
  { to: "/results", label: "Results" },
  { to: "/gallery", label: "Gallery" },
  { to: "/notices", label: "Notices" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout() {
  const [drawer, setDrawer] = useState(false);
  const { data: settings } = useSiteSettings();
  const { data: social } = useSocialLinks();
  const loc = useLocation();

  useEffect(() => setDrawer(false), [loc.pathname]);

  const enabledSocial = (social ?? []).filter((s) => s.is_enabled && s.url && s.url !== "#");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Announcement bar */}
      {settings?.announcement_enabled && settings.announcement_text ? (
        <div className="bg-navy-dark px-4 py-2 text-center text-xs sm:text-sm text-white">
          {settings.announcement_text}
        </div>
      ) : null}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-lightgray bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container-app flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label={`${settings?.academy_name ?? "Bokaro Defence Academy"} — home`}>
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="" className="h-9 w-9 rounded-md object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy text-saffron">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
            )}
            <span className="leading-tight">
              <span className="block font-heading text-sm font-bold text-navy sm:text-base">{settings?.academy_name ?? "Bokaro Defence Academy"}</span>
              {settings?.tagline ? <span className="block text-[11px] text-muted">{settings.tagline}</span> : null}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-navy-50 text-navy" : "text-ink/80 hover:bg-navy-50 hover:text-navy"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link to="/login" className="btn-outline btn-sm">Student Login</Link>
            <Link to="/admissions#apply" className="btn-accent btn-sm">Apply Now</Link>
          </div>

          <button
            className="rounded-md p-2 text-navy lg:hidden"
            onClick={() => setDrawer((d) => !d)}
            aria-expanded={drawer}
            aria-label={drawer ? "Close menu" : "Open menu"}
          >
            {drawer ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {drawer ? (
          <div className="border-t border-lightgray bg-white lg:hidden">
            <nav className="container-app flex flex-col py-2" aria-label="Mobile navigation">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-3 text-sm font-medium ${isActive ? "bg-navy-50 text-navy" : "text-ink/80"}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <div className="flex gap-2 px-3 py-3">
                <Link to="/login" className="btn-outline btn-sm flex-1 justify-center">Student Login</Link>
                <Link to="/admissions#apply" className="btn-accent btn-sm flex-1 justify-center">Apply Now</Link>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-navy-dark text-white">
        <div className="container-app grid gap-10 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-saffron">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-heading text-lg font-bold">{settings?.academy_name ?? "Bokaro Defence Academy"}</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{settings?.footer_description ?? ""}</p>
            <div className="mt-4 flex gap-3">
              {enabledSocial.map((s) => {
                return (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit our ${s.platform} page (opens in new tab)`}
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-saffron"
                  >
                    <span className="sr-only">{s.platform}</span>
                    <SocialGlyph platform={s.platform} />
                  </a>
                );
              })}
            </div>
          </div>

          <nav aria-label="Course links">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white/60">Courses</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/courses" className="text-white/75 hover:text-white">All Courses</Link></li>
              <li><Link to="/courses" className="text-white/75 hover:text-white">NDA Coaching</Link></li>
              <li><Link to="/courses" className="text-white/75 hover:text-white">CDS Coaching</Link></li>
              <li><Link to="/courses" className="text-white/75 hover:text-white">Agniveer Coaching</Link></li>
            </ul>
            <h3 className="mt-6 font-heading text-sm font-bold uppercase tracking-wide text-white/60">Quick Links</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/admissions" className="text-white/75 hover:text-white">Admissions</Link></li>
              <li><Link to="/results" className="text-white/75 hover:text-white">Results</Link></li>
              <li><Link to="/notices" className="text-white/75 hover:text-white">Notices</Link></li>
              <li><Link to="/login" className="text-white/75 hover:text-white">Student Login</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white/60">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              {settings?.address ? <li>{settings.address}</li> : null}
              {settings?.phone ? (
                <li><a href={telLink(settings.phone)} className="hover:text-white">{settings.phone}</a></li>
              ) : null}
              {settings?.email ? (
                <li><a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a></li>
              ) : null}
              {settings?.business_hours ? <li>{settings.business_hours}</li> : null}
            </ul>
            <h3 className="mt-6 font-heading text-sm font-bold uppercase tracking-wide text-white/60">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/privacy-policy" className="text-white/75 hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-white/75 hover:text-white">Terms &amp; Conditions</Link></li>
              <li><Link to="/refund-policy" className="text-white/75 hover:text-white">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} {settings?.academy_name ?? "Bokaro Defence Academy"}. All rights reserved.
        </div>
      </footer>

      {/* Floating actions — stacked so chatbot and buttons never overlap */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {settings?.chatbot_enabled ? <ChatbotWidget /> : null}
        {settings?.floating_whatsapp_enabled && settings?.whatsapp ? (
          <a
            href={waLink(settings.whatsapp, "Hello, I would like to know about admissions.")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp (opens in new tab)"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-academy text-white shadow-lift transition-transform hover:scale-105"
          >
            <MessageCircle className="h-6 w-6" aria-hidden />
          </a>
        ) : null}
        {settings?.floating_call_enabled && settings?.phone ? (
          <a
            href={telLink(settings.phone)}
            aria-label="Call the academy"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-saffron text-white shadow-lift transition-transform hover:scale-105"
          >
            <Phone className="h-6 w-6" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Inline SVG glyphs for social platforms (official-style marks, simplified). */
function SocialGlyph({ platform }: { platform: string }) {
  const cls = "h-4 w-4";
  switch (platform) {
    case "facebook":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.6-.1-1.4-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4V11H8v3h2.2v7h3.3z"/></svg>;
    case "instagram":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.2c-2.7 0-3 0-4.1.1-1 0-1.7.2-2.3.4-.6.3-1.2.6-1.7 1.1-.5.5-.9 1.1-1.1 1.7-.2.6-.4 1.3-.4 2.3C2.2 9 2.2 9.3 2.2 12s0 3 .1 4.1c0 1 .2 1.7.4 2.3.3.6.6 1.2 1.1 1.7.5.5 1.1.9 1.7 1.1.6.2 1.3.4 2.3.4 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c1 0 1.7-.2 2.3-.4.6-.3 1.2-.6 1.7-1.1.5-.5.9-1.1 1.1-1.7.2-.6.4-1.3.4-2.3.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c0-1-.2-1.7-.4-2.3-.3-.6-.6-1.2-1.1-1.7-.5-.5-1.1-.9-1.7-1.1-.6-.2-1.3-.4-2.3-.4C15 2.2 14.7 2.2 12 2.2zm0 1.8c2.7 0 2.9 0 4 .1.9 0 1.4.2 1.7.3.4.2.7.4 1 .7.3.3.5.6.7 1 .1.3.3.8.3 1.7.1 1.1.1 1.3.1 4s0 2.9-.1 4c0 .9-.2 1.4-.3 1.7-.2.4-.4.7-.7 1-.3.3-.6.5-1 .7-.3.1-.8.3-1.7.3-1.1.1-1.3.1-4 .1s-2.9 0-4-.1c-.9 0-1.4-.2-1.7-.3-.4-.2-.7-.4-1-.7-.3-.3-.5-.6-.7-1-.1-.3-.3-.8-.3-1.7-.1-1.1-.1-1.3-.1-4s0-2.9.1-4c0-.9.2-1.4.3-1.7.2-.4.4-.7.7-1 .3-.3.6-.5 1-.7.3-.1.8-.3 1.7-.3 1.1-.1 1.3-.1 4-.1zm0 3.1a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm6.3-8.3a1.1 1.1 0 11-2.3 0 1.1 1.1 0 012.3 0z"/></svg>;
    case "youtube":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M23 12s0-3.3-.4-4.8c-.2-.8-.9-1.5-1.7-1.7C19.4 5 12 5 12 5s-7.4 0-8.9.5c-.8.2-1.5.9-1.7 1.7C1 8.7 1 12 1 12s0 3.3.4 4.8c.2.8.9 1.5 1.7 1.7C4.6 19 12 19 12 19s7.4 0 8.9-.5c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.8.4-4.8zM9.8 15.1V8.9l5.8 3.1-5.8 3.1z"/></svg>;
    case "whatsapp":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a9.9 9.9 0 00-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1012 2zm5 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.1.1.3 0 .5-.3.6-.7.9-.5 1.2.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.2.4-.3.6-.2l2 1c.2.1.4.2.4.3.1.2.1.8-.2 1.4z"/></svg>;
    case "linkedin":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.9 8.6H3.5V21h3.4V8.6zM5.2 3.5a2 2 0 100 4 2 2 0 000-4zM20.5 14.2c0-3.3-1.8-4.9-4.2-4.9-1.9 0-2.8 1.1-3.3 1.8V8.6h-3.4V21h3.4v-6.7c0-.4 0-.9.2-1.2.3-.7.9-1.4 1.9-1.4 1.3 0 1.9 1 1.9 2.5V21h3.4v-6.8z"/></svg>;
    case "twitter":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.5 3h3l-6.6 7.5L21.5 21h-6l-4.7-6.1L5.4 21h-3l7-8L2.5 3h6.2l4.2 5.6L17.5 3zm-1 16h1.7L7.4 4.7H5.6L16.5 19z"/></svg>;
    default:
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="12" cy="12" r="8"/></svg>;
  }
}
