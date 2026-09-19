import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { formatDate } from "@/lib/format";
import Seo from "@/components/site/Seo";
import { EmptyState, Spinner, Badge } from "@/components/ui";

interface AlbumImage { id: string; image_url: string; caption: string | null; }

export default function Gallery() {
  const { data: settings } = useSiteSettings();
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: AlbumImage[]; index: number } | null>(null);

  const { data: albums, isLoading } = useQuery({
    queryKey: ["public_gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_albums")
        .select("*")
        .eq("status", "published")
        .is("archived_at", null)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: images } = useQuery({
    queryKey: ["public_gallery_images", activeAlbum],
    enabled: !!activeAlbum,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id,image_url,caption,album_id,display_order")
        .eq("album_id", activeAlbum!)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Keyboard navigation + scroll lock for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((l) => l && { ...l, index: (l.index + 1) % l.images.length });
      if (e.key === "ArrowLeft") setLightbox((l) => l && { ...l, index: (l.index - 1 + l.images.length) % l.images.length });
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  const album = albums?.find((a: any) => a.id === activeAlbum);

  return (
    <>
      <Seo title={`Gallery — ${settings?.academy_name ?? "Bokaro Defence Academy"}`} description="Photo albums from academy events, classes and training sessions." />
      <div className="bg-navy py-12 text-white">
        <div className="container-app">
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Gallery</h1>
          <p className="mt-2 text-white/75">Moments from classes, training and academy events.</p>
        </div>
      </div>

      <section className="container-app py-10">
        {isLoading ? (
          <Spinner label="Loading gallery…" />
        ) : !albums?.length ? (
          <EmptyState title="No albums published yet" description="Photographs will appear here as albums are published by the academy." />
        ) : !activeAlbum ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a: any) => (
              <button key={a.id} onClick={() => setActiveAlbum(a.id)} className="card group overflow-hidden text-left transition-shadow hover:shadow-lift">
                <div className="aspect-[4/3] overflow-hidden bg-navy-50">
                  {a.cover_url ? (
                    <img src={a.cover_url} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center text-navy-300"><CalendarDays className="h-8 w-8" aria-hidden /></div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-heading font-bold text-navy">{a.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {a.category ? `${a.category} · ` : ""}{a.event_date ? formatDate(a.event_date) : ""}
                  </p>
                  {a.description ? <p className="mt-2 line-clamp-2 text-sm text-muted">{a.description}</p> : null}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <button onClick={() => setActiveAlbum(null)} className="btn-ghost btn-sm mb-2">← All albums</button>
                <h2 className="font-heading text-2xl font-bold">{album?.title}</h2>
                {album?.description ? <p className="mt-1 text-sm text-muted">{album.description}</p> : null}
              </div>
              {album?.event_date ? <Badge tone="navy">{formatDate(album.event_date)}</Badge> : null}
            </div>
            {!images?.length ? (
              <EmptyState title="No images in this album yet" />
            ) : (
              <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
                {images.map((img: any, i: number) => (
                  <button key={img.id} onClick={() => setLightbox({ images, index: i })} className="block w-full overflow-hidden rounded-lg" aria-label={`Open image: ${img.caption ?? "gallery photo"}`}>
                    <img src={img.image_url} alt={img.caption ?? "Gallery photograph"} loading="lazy" className="w-full rounded-lg transition-transform hover:opacity-95" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lightbox */}
        {lightbox ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/95 p-4" role="dialog" aria-modal="true" aria-label="Image viewer">
            <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-md p-2 text-white hover:bg-white/10" aria-label="Close viewer">
              <X className="h-6 w-6" />
            </button>
            <button
              onClick={() => setLightbox((l) => l && { ...l, index: (l.index - 1 + l.images.length) % l.images.length })}
              className="absolute left-2 sm:left-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <figure className="max-h-full max-w-3xl">
              <img
                src={lightbox.images[lightbox.index].image_url}
                alt={lightbox.images[lightbox.index].caption ?? "Gallery photograph"}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
              {lightbox.images[lightbox.index].caption ? (
                <figcaption className="mt-3 text-center text-sm text-white/80">{lightbox.images[lightbox.index].caption}</figcaption>
              ) : null}
            </figure>
            <button
              onClick={() => setLightbox((l) => l && { ...l, index: (l.index + 1) % l.images.length })}
              className="absolute right-2 sm:right-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}
