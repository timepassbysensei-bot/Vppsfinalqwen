import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, Field, Input } from "@/components/ui";
import type { AppRole } from "@/types/database";

const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { session, roles, loading } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // If already signed in, send to the right dashboard (or returnTo target)
  useEffect(() => {
    if (!loading && session && roles.length) {
      const returnTo: string | undefined = loc.state?.returnTo;
      if (returnTo) nav(returnTo, { replace: true });
      else nav(ROLE_HOME[roles[0]] ?? "/", { replace: true });
    }
  }, [loading, session, roles, nav, loc.state]);

  async function onSubmit(values: LoginInput) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : error.message,
      );
      return;
    }
    if (!data.session) {
      toast.info("Please verify your email before signing in.");
      return;
    }
    // roles load via AuthProvider; redirect based on fetched roles
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const role = (roleRows?.[0]?.role as AppRole) ?? null;
    const returnTo: string | undefined = loc.state?.returnTo;
    if (returnTo) nav(returnTo, { replace: true });
    else if (role) nav(ROLE_HOME[role] ?? "/", { replace: true });
    else {
      toast.error("Your account has no role assigned. Please contact the office.");
      await supabase.auth.signOut();
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-offwhite px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-saffron">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-heading text-xl font-bold text-navy">Sign in to your account</h1>
          <p className="mt-1 text-sm text-muted">Students, teachers and administrators use the same login.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Email" required error={errors.email?.message}>
            <Input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label="Password" required error={errors.password?.message}>
            <div className="relative">
              <Input {...register("password")} type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="Your password" />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Button type="submit" loading={isSubmitting} className="w-full justify-center">Sign In</Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-problue hover:underline">Forgot password?</Link>
          <Link to="/" className="text-muted hover:underline">← Back to website</Link>
        </div>

        <p className="mt-6 border-t border-lightgray pt-4 text-center text-xs text-muted">
          Accounts are created by the academy office. If you don't have one, please contact us.
        </p>
      </Card>
    </main>
  );
}
