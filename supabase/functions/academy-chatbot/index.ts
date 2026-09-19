// Bokaro Defence Academy — academy-chatbot Edge Function
// Security: GEMINI_API_KEY lives ONLY here (Supabase secret). Never in the browser.
// Grounding: answers are built ONLY from published FAQs + published course info +
// public site settings fetched via service role. No private student data is sent.
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatRequest {
  message: string;
  locale?: string;
}

// naive in-memory rate limit: 10 req / 5 min / IP (per isolate; acceptable on free tier)
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= 10) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

function sanitize(text: string): string {
  return text.trim().slice(0, 500);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited", reply: "You're sending messages too quickly. Please wait a few minutes and try again." }), {
      status: 429, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "not_configured", reply: "The assistant is not configured yet. Please contact the office." }), {
      status: 503, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const { message } = await req.json() as ChatRequest;
    const clean = sanitize(message ?? "");
    if (clean.length < 2) {
      return new Response(JSON.stringify({ error: "bad_request", reply: "Please type a question about our courses or admissions." }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Grounding context: published FAQs + published courses + public settings.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const [faqRes, courseRes, settingsRes] = await Promise.all([
      admin.from("chatbot_faqs").select("question,answer,category").eq("is_published", true).is("archived_at", null).limit(60),
      admin.from("courses").select("title,slug,short_description,eligibility,duration,fee_display,admission_status,batch_timings").eq("status", "published").is("archived_at", null).limit(40),
      admin.from("site_settings").select("phone,whatsapp,email,address,business_hours,admission_status_text").eq("id", 1).maybeSingle(),
    ]);

    const faqBlock = (faqRes.data ?? []).map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
    const courseBlock = (courseRes.data ?? []).map((c: any) =>
      `- ${c.title}: ${c.short_description ?? ""} | Eligibility: ${c.eligibility ?? "not specified"} | Duration: ${c.duration ?? "not specified"} | Fee: ${c.fee_display ?? "Contact for fee"} | Batches: ${c.batch_timings ?? "not specified"}`
    ).join("\n");
    const s = settingsRes.data ?? {};

    const systemPrompt = `You are the official assistant for Bokaro Defence Academy, a coaching academy for Indian defence examinations.
Answer ONLY questions about: courses, eligibility, the admission process, batch timings, required documents, facilities, and contact information.
Use ONLY the reference information below. If the answer is not in the reference information, say clearly: "I don't have that information yet — please contact the office."
Never invent fees, dates, timings, results, or claims. Keep answers under 120 words, friendly and professional. Do not discuss private student data.
If asked something unrelated to the academy, politely decline.

REFERENCE — FAQs:
${faqBlock || "(none published yet)"}

REFERENCE — Published courses:
${courseBlock || "(none published yet)"}

REFERENCE — Contact info (may be sample values):
Phone: ${s.phone ?? "not set"} | WhatsApp: ${s.whatsapp ?? "not set"} | Email: ${s.email ?? "not set"}
Address: ${s.address ?? "not set"} | Hours: ${s.business_hours ?? "not set"}
Admission status: ${s.admission_status_text ?? "not set"}`;

    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: clean }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
    };

    const aiRes = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error("Gemini error:", aiRes.status, detail.slice(0, 500));
      return new Response(JSON.stringify({ error: "ai_error", reply: "The assistant is temporarily unavailable. Please try again, or contact the office directly." }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
      "Sorry, I couldn't generate an answer. Please contact the office.";

    // Log unanswered-looking questions without personal data
    const looksUnanswered = /don.t have|not sure|no information/i.test(reply);
    if (looksUnanswered) {
      await admin.rpc("log_chatbot_question", { p_question: clean, p_answered: false });
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    return new Response(JSON.stringify({ error: "server_error", reply: "Something went wrong. Please try again shortly." }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
