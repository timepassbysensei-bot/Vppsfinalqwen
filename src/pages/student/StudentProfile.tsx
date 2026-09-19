// Student Profile: read the academy's record for this student, keep contact
// details up to date and request a password reset. Academic fields (batch,
// student ID, enrollment) are academy-controlled and read-only here.
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserRound, Save, KeyRound, Info, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Spinner, Badge } from "@/components/ui";

export default function StudentProfile() {
  const qc = useQueryClient();
  const { user, profile, refreshRoles } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name,email,phone")
        .eq("id", user!.id)
        .maybeSingle();

      const enrollments = student
        ? (await supabase
            .from("enrollments")
            .select("id,enrolled_on,batches(name,timing,courses(title))")
            .eq("student_id", student.id)
            .is("left_on", null)).data ?? []
        : [];

      return { student, prof, enrollments: enrollments as any[] };
    },
  });

  useEffect(() => {
    if (!data) return;
    setFullName(data.prof?.full_name ?? data.student?.full_name ?? "");
    setPhone(data.prof?.phone ?? data.student?.phone ?? "");
    setContactEmail(data.prof?.email ?? data.student?.email ?? "");
  }, [data]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      if (fullName.trim().length < 2) throw new Error("Enter your full name");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null, email: contactEmail.trim() || user.email })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Your details were updated");
      await refreshRoles();
      qc.invalidateQueries({ queryKey: ["student_profile", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update your details"),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      const email = user?.email;
      if (!email) throw new Error("No email address is on your account.");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Password reset link sent — check your email inbox."),
    onError: (e: any) => toast.error(e.message ?? "Could not send the reset email"),
  });

  if (isLoading) return <Spinner label="Loading your profile…" />;
  if (isError) return <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load your profile."}</div>;

  const student = data?.student;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">My Profile</h1>
        <p className="mt-0.5 text-sm text-muted">Keep your contact details up to date so the academy can reach you.</p>
      </div>

      {!student ? (
        <EmptyState
          title="Your account isn't linked to a student record yet"
          description="Contact the academy office to link your login. Once linked, your batches and academic details appear here."
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Editable contact details */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-heading font-bold">
            <UserRound className="h-4 w-4 text-problue" aria-hidden /> Contact details
          </h2>
          <form className="mt-4 space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(); }}>
            <Field label="Full name" required><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
            <Field label="Phone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Email" hint="Used for sign-in and important updates">
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2 border-t border-lightgray pt-4">
              <Button type="submit" loading={saveProfile.isPending}><Save className="h-4 w-4" aria-hidden /> Save details</Button>
              <Button type="button" variant="outline" onClick={() => resetPassword.mutate()} loading={resetPassword.isPending}>
                <KeyRound className="h-4 w-4" aria-hidden /> Change password
              </Button>
            </div>
          </form>
          <p className="mt-3 flex items-start gap-2 rounded-md bg-navy-50 p-3 text-xs text-navy">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            A password reset link is emailed to {profile?.email ?? "your registered address"}. The academy never sees your password.
          </p>
        </Card>

        {/* Academy record */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-heading font-bold">
            <Layers className="h-4 w-4 text-problue" aria-hidden /> Academy record
          </h2>
          {student ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Student ID</dt>
                <dd className="font-mono text-navy">{student.student_code}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Joined</dt>
                <dd className="text-navy">{formatDate(student.joined_on)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Guardian</dt>
                <dd className="text-navy">{student.guardian_name ?? "Not recorded"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Guardian phone</dt>
                <dd className="text-navy">{student.guardian_phone ?? "Not recorded"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">City</dt>
                <dd className="text-navy">{student.city ?? "Not recorded"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Status</dt>
                <dd>{student.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">No student record linked yet.</p>
          )}

          <h3 className="mt-6 font-heading font-semibold text-navy">My batches</h3>
          {data?.enrollments?.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {data.enrollments.map((e) => (
                <li key={e.id} className="rounded-md border border-lightgray p-3">
                  <p className="font-medium text-navy">{e.batches?.name}</p>
                  <p className="text-xs text-muted">
                    {e.batches?.courses?.title ?? "Course"} · {e.batches?.timing ?? "Timing to be announced"} · enrolled {formatDate(e.enrolled_on)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">You are not enrolled in a batch yet.</p>
          )}

          <p className="mt-4 text-xs text-muted">
            Batch, enrollment, marks and attendance records can only be changed by academy staff so your academic record stays accurate.
          </p>
        </Card>
      </div>
    </div>
  );
}
