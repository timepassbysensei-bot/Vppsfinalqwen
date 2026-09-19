// Admin Site Settings: the single editable row that drives branding, contact
// details, hero copy, SEO defaults, feature toggles and social links everywhere
// on the public site. Grouped into tabs so it stays usable on a phone.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Building2, Phone, Home as HomeIcon, Search, ToggleLeft, Share2, AlertTriangle, Upload, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { uploadPublic, IMAGE_ACCEPT } from "@/lib/storage";
import { Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import type { SiteSettings, SocialLink } from "@/types/database";

type TabKey = "identity" | "contact" | "hero" | "about" | "seo" | "features" | "social";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "identity", label: "Identity", icon: Building2 },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "hero", label: "Home page", icon: HomeIcon },
  { key: "about", label: "About content", icon: Info },
  { key: "seo", label: "SEO", icon: Search },
  { key: "features", label: "Features", icon: ToggleLeft },
  { key: "social", label: "Social links", icon: Share2 },
];

const SOCIAL_PLATFORMS: { key: SocialLink["platform"]; label: string }[] = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "X (Twitter)" },
];

const FEATURE_KEYS = [
  { key: "attendance_enabled", label: "Attendance tracking", help: "Teachers and admins can record daily attendance." },
  { key: "ranking_enabled", label: "Show ranks in results", help: "Allows rank columns on published test results." },
  { key: "submissions_enabled", label: "Assignment submissions", help: "Students can upload assignment files." },
  { key: "chatbot_enabled", label: "Website chat assistant", help: "Show the AI assistant bubble on the public site." },
  { key: "floating_call_enabled", label: "Floating call button", help: "Show a tap-to-call button on mobile." },
  { key: "floating_whatsapp_enabled", label: "Floating WhatsApp button", help: "Show a WhatsApp button on mobile." },
] as const;

export default function AdminSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("identity");
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: settings, isLoading, isError, error } = useQuery({
    queryKey: ["admin_site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as SiteSettings | null;
    },
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const { data: social } = useQuery({
    queryKey: ["admin_social_links"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_links").select("*").order("display_order");
      if (error) throw error;
      return data as SocialLink[];
    },
  });

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const socialByPlatform = useMemo(() => {
    const map = new Map<string, SocialLink>();
    (social ?? []).forEach((s) => map.set(s.platform, s));
    return map;
  }, [social]);

  const save = useMutation({
    mutationFn: async () => {
      if (!(form.academy_name ?? "").trim()) throw new Error("The academy name cannot be empty.");
      const allowed: (keyof SiteSettings)[] = [
        "academy_name", "tagline", "logo_url", "favicon_url",
        "address", "map_url", "phone", "phone_secondary", "whatsapp", "email", "business_hours",
        "hero_heading", "hero_description", "hero_image_url", "hero_image_position",
        "hero_primary_label", "hero_primary_href", "hero_secondary_label", "hero_secondary_href",
        "admission_status_text", "announcement_text", "announcement_enabled",
        "about_overview", "about_history", "mission", "vision", "teaching_approach",
        "directors_message", "directors_photo_url", "footer_description",
        "seo_title", "seo_description", "og_image_url",
        "attendance_enabled", "ranking_enabled", "submissions_enabled",
        "chatbot_enabled", "floating_call_enabled", "floating_whatsapp_enabled",
      ];
      const payload: Record<string, unknown> = { id: 1, updated_by: user?.id ?? null };
      allowed.forEach((k) => { payload[k] = form[k] ?? null; });
      const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved — the website is updated.");
      qc.invalidateQueries({ queryKey: ["admin_site_settings"] });
      qc.invalidateQueries({ queryKey: ["site_settings"] });
      qc.invalidateQueries({ queryKey: ["social_links"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save the settings"),
  });

  const saveSocial = useMutation({
    mutationFn: async ({ platform, url, is_enabled }: { platform: SocialLink["platform"]; url: string; is_enabled: boolean }) => {
      const existing = socialByPlatform.get(platform);
      const payload = { platform, url: url.trim(), is_enabled };
      if (existing) {
        const { error } = await supabase.from("social_links").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("social_links").insert({ ...payload, display_order: 100 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Social link saved");
      qc.invalidateQueries({ queryKey: ["admin_social_links"] });
      qc.invalidateQueries({ queryKey: ["social_links"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save the link"),
  });

  async function pickImage(field: keyof SiteSettings, file: File) {
    setUploading(field);
    try {
      const { url } = await uploadPublic("site-assets", file, "branding");
      set(field, url as any);
      toast.success("Image uploaded — remember to save.");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  if (isLoading) return <Spinner label="Loading settings…" />;
  if (isError) return <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load settings."}</div>;

  const placeholderWarning = ["address", "phone", "email", "whatsapp"].some((k) => {
    const v = String((form as any)[k] ?? "").toLowerCase();
    return !v || v.includes("sample") || v.includes("00000") || v.includes("example.com");
  });

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Site Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Everything here appears on the public website. Save when you are done.</p>
      </div>

      {placeholderWarning ? (
        <Card className="border-saffron-200 bg-saffron-50 p-4">
          <p className="flex items-start gap-2 text-sm text-navy">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-saffron-600" aria-hidden />
            <span>
              Some contact details still look like placeholders. Replace the sample address, phone number and email with the
              academy's real details before sharing the website with the public.
            </span>
          </p>
        </Card>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${tab === t.key ? "bg-navy text-white" : "bg-white text-ink/80 border border-lightgray hover:bg-navy-50"}`}
          >
            <t.icon className="h-4 w-4" aria-hidden /> {t.label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        {tab === "identity" ? (
          <div className="space-y-4">
            <Field label="Academy name" required>
              <Input value={form.academy_name ?? ""} onChange={(e) => set("academy_name", e.target.value)} />
            </Field>
            <Field label="Tagline" hint="A short line shown under the name">
              <Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField label="Logo" value={form.logo_url ?? ""} onChange={(v) => set("logo_url", v)} uploading={uploading === "logo_url"} onPick={(f) => pickImage("logo_url", f)} />
              <ImageField label="Favicon" value={form.favicon_url ?? ""} onChange={(v) => set("favicon_url", v)} uploading={uploading === "favicon_url"} onPick={(f) => pickImage("favicon_url", f)} />
            </div>
          </div>
        ) : null}

        {tab === "contact" ? (
          <div className="space-y-4">
            <Field label="Address"><Textarea rows={3} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="Google Maps link" hint="Optional — paste the share link for the location">
              <Input value={form.map_url ?? ""} onChange={(e) => set("map_url", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><Input type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Alternate phone"><Input type="tel" value={form.phone_secondary ?? ""} onChange={(e) => set("phone_secondary", e.target.value)} /></Field>
              <Field label="WhatsApp number" hint="Digits only, with country code"><Input type="tel" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
            </div>
            <Field label="Office hours"><Input value={form.business_hours ?? ""} onChange={(e) => set("business_hours", e.target.value)} placeholder="Mon–Sat: 8:00 AM – 7:00 PM" /></Field>
            <Field label="Admission status text" hint="Shown near the Apply button, e.g. “Admissions open for 2026”">
              <Input value={form.admission_status_text ?? ""} onChange={(e) => set("admission_status_text", e.target.value)} />
            </Field>
          </div>
        ) : null}

        {tab === "hero" ? (
          <div className="space-y-4">
            <Field label="Hero heading"><Input value={form.hero_heading ?? ""} onChange={(e) => set("hero_heading", e.target.value)} /></Field>
            <Field label="Hero description"><Textarea rows={3} value={form.hero_description ?? ""} onChange={(e) => set("hero_description", e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField label="Hero image" value={form.hero_image_url ?? ""} onChange={(v) => set("hero_image_url", v)} uploading={uploading === "hero_image_url"} onPick={(f) => pickImage("hero_image_url", f)} />
              <Field label="Hero image focus">
                <Select value={form.hero_image_position ?? "center"} onChange={(e) => set("hero_image_position", e.target.value)}>
                  <option value="center">Centre</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary button label"><Input value={form.hero_primary_label ?? ""} onChange={(e) => set("hero_primary_label", e.target.value)} /></Field>
              <Field label="Primary button link"><Input value={form.hero_primary_href ?? ""} onChange={(e) => set("hero_primary_href", e.target.value)} placeholder="/admissions" /></Field>
              <Field label="Secondary button label"><Input value={form.hero_secondary_label ?? ""} onChange={(e) => set("hero_secondary_label", e.target.value)} /></Field>
              <Field label="Secondary button link"><Input value={form.hero_secondary_href ?? ""} onChange={(e) => set("hero_secondary_href", e.target.value)} placeholder="/courses" /></Field>
            </div>
            <div className="rounded-md border border-lightgray p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={!!form.announcement_enabled} onChange={(e) => set("announcement_enabled", e.target.checked)} />
                Show an announcement bar above the header
              </label>
              <div className="mt-3">
                <Field label="Announcement text">
                  <Input value={form.announcement_text ?? ""} onChange={(e) => set("announcement_text", e.target.value)} disabled={!form.announcement_enabled} />
                </Field>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "about" ? (
          <div className="space-y-4">
            <Field label="Academy overview"><Textarea rows={4} value={form.about_overview ?? ""} onChange={(e) => set("about_overview", e.target.value)} /></Field>
            <Field label="Our history"><Textarea rows={4} value={form.about_history ?? ""} onChange={(e) => set("about_history", e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mission"><Textarea rows={4} value={form.mission ?? ""} onChange={(e) => set("mission", e.target.value)} /></Field>
              <Field label="Vision"><Textarea rows={4} value={form.vision ?? ""} onChange={(e) => set("vision", e.target.value)} /></Field>
            </div>
            <Field label="Teaching approach"><Textarea rows={4} value={form.teaching_approach ?? ""} onChange={(e) => set("teaching_approach", e.target.value)} /></Field>
            <Field label="Director's message"><Textarea rows={4} value={form.directors_message ?? ""} onChange={(e) => set("directors_message", e.target.value)} /></Field>
            <ImageField label="Director's photograph" value={form.directors_photo_url ?? ""} onChange={(v) => set("directors_photo_url", v)} uploading={uploading === "directors_photo_url"} onPick={(f) => pickImage("directors_photo_url", f)} />
            <Field label="Footer description"><Textarea rows={2} value={form.footer_description ?? ""} onChange={(e) => set("footer_description", e.target.value)} /></Field>
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className="space-y-4">
            <Field label="Default page title" hint="Shown in browser tabs and search results">
              <Input value={form.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} />
            </Field>
            <Field label="Default meta description" hint="Aim for 150–160 characters">
              <Textarea rows={3} value={form.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} />
            </Field>
            <ImageField label="Social share image" value={form.og_image_url ?? ""} onChange={(v) => set("og_image_url", v)} uploading={uploading === "og_image_url"} onPick={(f) => pickImage("og_image_url", f)} />
          </div>
        ) : null}

        {tab === "features" ? (
          <div className="space-y-3">
            {FEATURE_KEYS.map((f) => (
              <label key={f.key} className="flex items-start gap-3 rounded-md border border-lightgray p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-lightgray text-navy"
                  checked={!!(form as any)[f.key]}
                  onChange={(e) => set(f.key as keyof SiteSettings, e.target.checked as any)}
                />
                <span>
                  <span className="block text-sm font-medium text-navy">{f.label}</span>
                  <span className="block text-xs text-muted">{f.help}</span>
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {tab === "social" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Add only the academy's real, official profiles. Links left disabled are not shown on the website.
            </p>
            {SOCIAL_PLATFORMS.map((p) => {
              const existing = socialByPlatform.get(p.key);
              return (
                <SocialRow
                  key={p.key}
                  label={p.label}
                  url={existing?.url ?? ""}
                  enabled={existing?.is_enabled ?? false}
                  onSave={(url, enabled) => saveSocial.mutate({ platform: p.key, url, is_enabled: enabled })}
                  saving={saveSocial.isPending}
                />
              );
            })}
          </div>
        ) : null}
      </Card>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-lightgray bg-white/95 px-4 py-3 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="hidden text-xs text-muted sm:block">Changes are not published until you save.</p>
          <Button onClick={() => save.mutate()} loading={save.isPending} className="w-full sm:w-auto">
            <Save className="h-4 w-4" aria-hidden /> Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange, onPick, uploading }: {
  label: string; value: string; onChange: (v: string) => void; onPick: (f: File) => void; uploading: boolean;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        {value ? <img src={value} alt="" className="h-14 w-14 rounded-md border border-lightgray object-cover" /> : null}
        <label className={`btn-outline btn-sm ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
          <Upload className="h-3.5 w-3.5" aria-hidden /> {uploading ? "Uploading…" : "Upload"}
          <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
        </label>
        {value ? <Button variant="ghost" size="sm" type="button" onClick={() => onChange("")}>Clear</Button> : null}
      </div>
      <Input className="mt-2" value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" aria-label={`${label} URL`} />
    </div>
  );
}

function SocialRow({ label, url, enabled, onSave, saving }: {
  label: string; url: string; enabled: boolean; onSave: (url: string, enabled: boolean) => void; saving: boolean;
}) {
  const [value, setValue] = useState(url);
  const [isEnabled, setIsEnabled] = useState(enabled);
  useEffect(() => { setValue(url); setIsEnabled(enabled); }, [url, enabled]);
  return (
    <div className="rounded-md border border-lightgray p-3">
      <p className="mb-2 text-sm font-medium text-navy">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`https://…`} aria-label={`${label} URL`} />
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          Show on site
        </label>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => onSave(value, isEnabled)}>Save</Button>
      </div>
    </div>
  );
}
