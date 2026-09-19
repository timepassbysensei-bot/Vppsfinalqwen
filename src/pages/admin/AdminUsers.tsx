// Admin User Roles: list accounts, invite new users by email, grant/revoke roles
// and activate/deactivate accounts. All privileged work happens in SECURITY
// DEFINER RPCs or the invite-user Edge Function — never in the browser.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, ShieldCheck, ShieldOff, UserCheck, UserX, KeyRound, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge } from "@/components/ui";
import type { AppRole, Teacher, Student } from "@/types/database";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  must_change_password: boolean;
  roles: AppRole[];
  created_at: string;
}

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};

const ROLE_TONE: Record<AppRole, "navy" | "green" | "amber" | "gray"> = {
  super_admin: "navy", admin: "green", teacher: "amber", student: "gray",
};

interface InviteForm {
  email: string;
  full_name: string;
  phone: string;
  role: AppRole;
  teacher_id: string;
  student_id: string;
}

const EMPTY: InviteForm = { email: "", full_name: "", phone: "", role: "student", teacher_id: "", student_id: "" };

export default function AdminUsers() {
  const qc = useQueryClient();
  const { has, user } = useAuth();
  const isSuperAdmin = has("super_admin");
  const [q, setQ] = useState("");
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState<InviteForm>(EMPTY);
  const [error, setError] = useState("");
  const [granting, setGranting] = useState<UserRow | null>(null);
  const [grantRole, setGrantRole] = useState<AppRole>("teacher");

  const { data: users, isLoading, isError, error: loadError } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["admin_teachers_unlinked"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id,full_name,user_id").is("user_id", null).order("full_name");
      if (error) throw error;
      return data as Pick<Teacher, "id" | "full_name" | "user_id">[];
    },
  });

  const { data: students } = useQuery({
    queryKey: ["admin_students_unlinked"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id,full_name,student_code,user_id").is("user_id", null).is("archived_at", null).order("full_name").limit(200);
      if (error) throw error;
      return data as Pick<Student, "id" | "full_name" | "student_code" | "user_id">[];
    },
  });

  const filtered = useMemo(() => {
    const list = users ?? [];
    if (!q.trim()) return list;
    const t = q.trim().toLowerCase();
    return list.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t) ||
      u.roles.some((r) => ROLE_LABEL[r].toLowerCase().includes(t)),
    );
  }, [users, q]);

  const invite = useMutation({
    mutationFn: async (values: InviteForm) => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) throw new Error("Enter a valid email address");
      if (values.full_name.trim().length < 2) throw new Error("Enter the person's full name");
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: values.email.trim(),
          full_name: values.full_name.trim(),
          role: values.role,
          phone: values.phone.trim() || null,
          teacher_id: values.teacher_id || null,
          student_id: values.student_id || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message ?? "Invitation failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Invitation sent. They will set their own password from the email link.");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      setInviting(false);
      setForm(EMPTY);
    },
    onError: (e: any) => setError(e.message ?? "Invitation failed"),
  });

  const grant = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc("admin_grant_role", { p_user_id: userId, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role granted");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      setGranting(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Could not grant the role"),
  });

  const revoke = useMutation({
    mutationFn: async ({ userId, role, name }: { userId: string; role: AppRole; name: string }) => {
      if (!confirm(`Revoke the “${ROLE_LABEL[role]}” role from ${name || "this user"}?`)) throw new Error("cancelled");
      const { error } = await supabase.rpc("admin_revoke_role", { p_user_id: userId, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role revoked");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: any) => { if (e.message !== "cancelled") toast.error(e.message ?? "Could not revoke the role"); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_active", { p_user_id: userId, p_active: active });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? "Account activated" : "Account deactivated");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update the account"),
  });

  const roleOptions: AppRole[] = isSuperAdmin ? ["super_admin", "admin", "teacher", "student"] : ["student"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">User Roles</h1>
          <p className="mt-0.5 text-sm text-muted">
            Accounts and permissions. Roles are assigned server-side only — the browser cannot escalate privileges.
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setError(""); setInviting(true); }}>
          <Plus className="h-4 w-4" aria-hidden /> Invite User
        </Button>
      </div>

      {!isSuperAdmin ? (
        <Card className="border-saffron-200 bg-saffron-50 p-4 text-sm text-navy">
          You are signed in as an Admin. Only a Super Admin can grant or revoke staff roles.
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or role…" className="pl-9" aria-label="Search users" />
        </div>
      </Card>

      {isLoading ? (
        <Spinner label="Loading accounts…" />
      ) : isError ? (
        <div className="card p-5 text-sm text-error" role="alert">{(loadError as Error)?.message ?? "Could not load accounts."}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No accounts found"
          description="Invite a teacher or student to create their account and send them a secure sign-in link."
          action={<Button onClick={() => setInviting(true)}>Invite User</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <Card key={u.user_id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading font-bold text-navy">
                    {u.full_name || u.email}
                    {u.user_id === user?.id ? <span className="ml-2 text-xs font-normal text-muted">(you)</span> : null}
                  </h2>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                  <p className="mt-0.5 text-xs text-muted">Joined {formatDate(u.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {u.roles.length ? u.roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => isSuperAdmin && revoke.mutate({ userId: u.user_id, role: r, name: u.full_name || u.email })}
                      title={isSuperAdmin ? `Revoke ${ROLE_LABEL[r]}` : undefined}
                      className="inline-flex items-center gap-1"
                    >
                      <Badge tone={ROLE_TONE[r]}>
                        {ROLE_LABEL[r]}
                        {isSuperAdmin ? <ShieldOff className="h-3 w-3" aria-hidden /> : null}
                      </Badge>
                    </button>
                  )) : <Badge tone="gray">No role</Badge>}
                  {u.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                  {u.must_change_password ? <Badge tone="amber"><KeyRound className="h-3 w-3" aria-hidden /> Password pending</Badge> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Button variant="outline" size="sm" disabled={!isSuperAdmin} onClick={() => { setGrantRole("teacher"); setGranting(u); }}>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Grant role
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={u.user_id === user?.id}
                  onClick={() => toggleActive.mutate({ userId: u.user_id, active: !u.is_active })}
                >
                  {u.is_active
                    ? <><UserX className="h-3.5 w-3.5" aria-hidden /> Deactivate</>
                    : <><UserCheck className="h-3.5 w-3.5" aria-hidden /> Activate</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite modal */}
      <Modal open={inviting} onClose={() => setInviting(false)} title="Invite a user" wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); invite.mutate(form); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Email" required hint="The invitation link is sent here">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone"><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Role" hint={!isSuperAdmin ? "Admins can only invite students" : undefined}>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole, teacher_id: "", student_id: "" })}>
                {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </Select>
            </Field>
          </div>
          {form.role === "teacher" ? (
            <Field label="Link to a teacher record" hint="Links this login to an existing teacher profile">
              <Select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
                <option value="">Do not link</option>
                {(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </Select>
            </Field>
          ) : null}
          {form.role === "student" ? (
            <Field label="Link to a student record" hint="Links this login to an existing student profile">
              <Select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
                <option value="">Do not link</option>
                {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.full_name} · {s.student_code}</option>)}
              </Select>
            </Field>
          ) : null}
          <p className="rounded-md bg-navy-50 p-3 text-xs text-navy">
            <Mail className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            The user receives a secure email link to set their own password. The academy never sees or stores their password.
          </p>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => setInviting(false)}>Cancel</Button>
            <Button type="submit" loading={invite.isPending}>Send Invitation</Button>
          </div>
        </form>
      </Modal>

      {/* Grant role modal */}
      <Modal open={!!granting} onClose={() => setGranting(null)} title="Grant a role">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Add a role for <strong className="text-navy">{granting?.full_name || granting?.email}</strong>. Roles combine — a teacher may also be an admin.
          </p>
          <Field label="Role">
            <Select value={grantRole} onChange={(e) => setGrantRole(e.target.value as AppRole)}>
              {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button variant="outline" onClick={() => setGranting(null)}>Cancel</Button>
            <Button onClick={() => granting && grant.mutate({ userId: granting.user_id, role: grantRole })} loading={grant.isPending}>
              Grant {ROLE_LABEL[grantRole]}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
