// Shown only when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.
// Without them every query fails, which looks like a broken app rather than a
// missing configuration step, so we say so plainly.
import { isSupabaseConfigured } from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";

export default function SupabaseNotice() {
  if (isSupabaseConfigured) return null;

  return (
    <div className="border-b border-saffron-200 bg-saffron-50 px-4 py-2.5 text-center text-xs text-navy sm:text-sm" role="status">
      <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-saffron-600" aria-hidden />
      <strong>Setup needed:</strong> connect a Supabase project by adding{" "}
      <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">VITE_SUPABASE_URL</code> and{" "}
      <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code>, then restart the
      preview. See the README for the step-by-step guide.
    </div>
  );
}
