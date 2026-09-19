import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Input } from "@/components/ui";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address") });

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ email }: { email: string }) {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      toast.error("Could not send the reset email. Please check the address and try again.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-offwhite px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-saffron">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-heading text-xl font-bold text-navy">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">Enter your account email and we'll send a reset link.</p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center" role="status">
            <MailCheck className="h-10 w-10 text-success" aria-hidden />
            <p className="text-sm text-ink/90">
              If an account exists for that email, a password reset link has been sent. Please check your inbox (and spam folder).
            </p>
            <Link to="/login" className="btn-primary mt-2">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Email" required error={errors.email?.message}>
              <Input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" />
            </Field>
            <Button type="submit" loading={isSubmitting} className="w-full justify-center">Send Reset Link</Button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-problue hover:underline">Back to Login</Link>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}
