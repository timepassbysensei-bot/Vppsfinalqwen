// Bokaro Defence Academy — invite-user Edge Function
// Invites a student/teacher/admin by email. The caller's own admin role is
// verified server-side with their JWT before the service-role client is used,
// so the browser can never escalate privileges by calling this directly.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "super_admin" | "admin" | "teacher" | "student";

interface InviteRequest {
  email?: string;
  full_name?: string;
  role?: Role;
  phone?: string | null;
  teacher_id?: string | null;
  student_id?: string | null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = Deno.env.get("SITE_URL") ?? Deno.env.get("ALLOWED_SITE_URL") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "not_configured", message: "Invites are not configured on the server yet." }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized", message: "You must be signed in." }, 401);
  }

  // 1. Identify the caller from their JWT.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return json({ error: "unauthorized", message: "Your session has expired. Please sign in again." }, 401);
  }
  const callerId = callerData.user.id;

  const admin = createClient(supabaseUrl, serviceKey);

  // 2. Verify the caller is an admin (and is a Super Admin for staff roles).
  const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", callerId);
  const callerRoles = (roleRows ?? []).map((r: { role: Role }) => r.role);
  const isAdmin = callerRoles.includes("admin") || callerRoles.includes("super_admin");
  const isSuperAdmin = callerRoles.includes("super_admin");
  if (!isAdmin) return json({ error: "forbidden", message: "Only admins can invite users." }, 403);

  let payload: InviteRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad_request", message: "Invalid request body." }, 400);
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const fullName = (payload.full_name ?? "").trim();
  const role: Role = payload.role ?? "student";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "bad_request", message: "A valid email address is required to send an invitation." }, 400);
  }
  if (!["student", "teacher", "admin", "super_admin"].includes(role)) {
    return json({ error: "bad_request", message: "Unknown role." }, 400);
  }
  if (role !== "student" && !isSuperAdmin) {
    return json({ error: "forbidden", message: "Only a Super Admin can invite staff accounts." }, 403);
  }

  // 3. Create the account (or reuse an existing one) and send the invite link.
  let userId: string | null = null;
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name: fullName, role },
    redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
  });

  if (inviteError) {
    // Already registered: look the user up so we can still grant the role.
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!existing) {
      return json({ error: "invite_failed", message: inviteError.message }, 400);
    }
    userId = existing.id;
  } else {
    userId = inviteData.user?.id ?? null;
  }

  if (!userId) return json({ error: "invite_failed", message: "Could not create the account." }, 500);

  // 4. Keep profile, role and linked record in sync.
  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      { id: userId, full_name: fullName, email, phone: payload.phone ?? null, must_change_password: true },
      { onConflict: "id" },
    );
  if (profileError) return json({ error: "profile_failed", message: profileError.message }, 500);

  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role, assigned_by: callerId }, { onConflict: "user_id,role" });
  if (roleError) return json({ error: "role_failed", message: roleError.message }, 500);

  if (payload.teacher_id) {
    await admin.from("teachers").update({ user_id: userId }).eq("id", payload.teacher_id);
  }
  if (payload.student_id) {
    await admin.from("students").update({ user_id: userId }).eq("id", payload.student_id);
  }

  await admin.from("audit_logs").insert({
    actor: callerId,
    action: "INVITE_USER",
    entity: "user_roles",
    entity_id: userId,
    details: { email, role },
  });

  return json({ ok: true, user_id: userId, role, emailed: !inviteError });
});
