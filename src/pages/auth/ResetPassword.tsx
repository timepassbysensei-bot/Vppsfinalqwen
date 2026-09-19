import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@/lib/validation";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";

type FormVals = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormVals>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    supabase.auth.onAuthStateChange((evt) => {
      if (evt === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });
    // If a session already exists (user clicked the link while logged in elsewhere)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
      setChecking(false);
    });
  }, []);

  async function onSubmit({ password }: FormVals) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Could not update the password. The link may have expired — please request a new one.");
      return;
    }
    toast.success("Password updated. Please sign in with your new password.");
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  }

  if (checking) return <div className="grid min-h-screen place-items-center bg-offwhite"><Spinner label="Verifying reset link…" /></div>;

  return (
    <main className="grid min-h-screen place-items-center bg-offwhite px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-heading text-xl font-bold text-navy">Choose a new password</h1>
        {ready ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Field label="New Password" required error={errors.password?.message} hint="Minimum 8 characters">
              <Input {...register("password")} type="password" autoComplete="new-password" />
            </Field>
            <Field label="Confirm Password" required error={errors.confirm?.message}>
              <Input {...register("confirm")} type="password" autoComplete="new-password" />
            </Field>
            <Button type="submit" loading={isSubmitting} className="w-full justify-center">Update Password</Button>
          </form>
        ) : (
          <div className="mt-4 text-sm text-muted">
            This page requires a valid password-reset link. Please request a new one from the{" "}
            <Link to="/forgot-password" className="text-problue hover:underline">forgot password page</Link>.
          </div>
        )}
      </Card>
    </main>
  );
}
