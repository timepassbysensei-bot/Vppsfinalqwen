// Auth context: session persistence + server-derived roles.
// NOTE: roles come from the user_roles table via RLS-protected reads. The browser
// can never insert into user_roles (no policy), so client state cannot escalate.
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/types/database";

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  profile: { full_name: string; email: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  has: (...roles: AppRole[]) => boolean;
  isStaff: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (user: User | null) => {
    if (!user) {
      setRoles([]);
      setProfile(null);
      return;
    }
    // Load roles (RLS limits rows to own unless admin)
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    setRoles((roleRows ?? []).map((r: any) => r.role as AppRole));

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email, is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (prof && !prof.is_active) {
      // Deactivated account: force sign-out
      await supabase.auth.signOut();
      setRoles([]);
      setProfile(null);
      return;
    }
    setProfile(prof ? { full_name: prof.full_name, email: prof.email } : null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadUserData(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      setSession(sess);
      if (sess?.user) await loadUserData(sess.user);
      else {
        setRoles([]);
        setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRoles([]);
    setProfile(null);
  }, []);

  const refreshRoles = useCallback(async () => {
    await loadUserData(session?.user ?? null);
  }, [loadUserData, session]);

  const has = useCallback(
    (...need: AppRole[]) => need.some((r) => roles.includes(r)),
    [roles],
  );

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    roles,
    profile,
    loading,
    signOut,
    refreshRoles,
    has,
    isStaff: has("super_admin", "admin", "teacher"),
    isAdmin: has("super_admin", "admin"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
