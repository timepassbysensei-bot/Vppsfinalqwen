// Floating chatbot widget. Talks to the academy-chatbot Edge Function only —
// no API keys in the browser. Shows graceful fallback CTAs on failure.
import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface Msg {
  from: "bot" | "user";
  text: string;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Hello! Ask me about courses, eligibility, admissions or batch timings." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: settings } = useSiteSettings();
  const listRef = useRef<HTMLDivElement>(null);
  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academy-chatbot`;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setMsgs((m) => [...m, { from: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { from: "bot", text: data.reply ?? "Sorry, something went wrong. Please try again." }]);
    } catch {
      setMsgs((m) => [...m, {
        from: "bot",
        text: "I couldn't reach the assistant right now. You can call or WhatsApp the office — happy to help!",
      }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open chat assistant"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white shadow-lift transition-transform hover:scale-105"
      >
        <MessageSquare className="h-6 w-6" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex h-[26rem] w-[calc(100vw-2rem)] max-w-xs flex-col overflow-hidden rounded-xl border border-lightgray bg-white shadow-lift sm:w-80">
      <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-saffron" aria-hidden />
          <span className="text-sm font-semibold">Academy Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-offwhite p-3" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from === "bot" ? "bg-white text-ink shadow-card" : "ml-auto bg-navy text-white"}`}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="max-w-[85%] rounded-lg bg-white px-3 py-2 text-sm text-muted shadow-card">Thinking…</div>
        )}
      </div>

      <div className="border-t border-lightgray bg-white p-2">
        <div className="mb-2 flex gap-1.5 text-[11px]">
          <Link to="/admissions#apply" onClick={() => setOpen(false)} className="rounded-full bg-navy-50 px-2 py-1 text-navy hover:bg-navy-100">Inquiry</Link>
          {settings?.whatsapp ? (
            <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-navy-50 px-2 py-1 text-navy hover:bg-navy-100">WhatsApp</a>
          ) : null}
          {settings?.phone ? (
            <a href={`tel:${settings.phone}`} className="rounded-full bg-navy-50 px-2 py-1 text-navy hover:bg-navy-100">Call</a>
          ) : null}
        </div>
        <p className="mb-2 px-1 text-[10px] leading-snug text-muted">
          Disclaimer: For exact fees, eligibility and schedules, please confirm with the office.
        </p>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            aria-label="Chat message"
            maxLength={500}
            className="input min-h-[40px] flex-1 py-2 text-sm"
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send message"
            className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
