// Lightweight SEO component: sets title/meta/OG per page without extra deps.
import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  image?: string | null;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function Seo({ title, description, image, jsonLd, noindex }: SeoProps) {
  useEffect(() => {
    document.title = title;
    if (description) upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    if (description) upsertMeta("property", "og:description", description);
    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
    }
    upsertMeta("name", "robots", noindex ? "noindex,nofollow" : "index,follow");

    const scriptId = "page-jsonld";
    document.getElementById(scriptId)?.remove();
    if (jsonLd) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.type = "application/ld+json";
      s.text = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [title, description, image, jsonLd, noindex]);

  return null;
}
