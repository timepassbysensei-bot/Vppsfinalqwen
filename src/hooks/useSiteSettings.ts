import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SiteSettings, SocialLink } from "@/types/database";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SiteSettings | null;
    },
    staleTime: 60_000,
  });
}

export function useSocialLinks() {
  return useQuery({
    queryKey: ["social_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_links")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as SocialLink[];
    },
    staleTime: 60_000,
  });
}
