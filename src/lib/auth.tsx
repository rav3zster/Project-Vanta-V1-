import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from "react";
import { supabase, api, type Profile } from "./supabase";

type AuthState = {
  profile: Profile | null;
  permissions: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (b: { email: string; password: string; username: string; region?: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: string) => boolean;
};

// Reuse a single context object across duplicate module evaluations so that
// AuthProvider and useAuth always share the same context (avoids the spurious
// "useAuth must be used within AuthProvider" under HMR / proxied previews).
const g = globalThis as unknown as { __vantaAuthCtx?: Context<AuthState | null> };
const AuthContext = g.__vantaAuthCtx ?? (g.__vantaAuthCtx = createContext<AuthState | null>(null));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setProfile(null);
        setPermissions([]);
        return;
      }
      // The profile row may be provisioned a beat after the session exists
      // (first login / just-created account), so retry once before giving up.
      let me: { profile: Profile; permissions: string[] } | null = null;
      for (let attempt = 0; attempt < 2 && !me; attempt++) {
        try {
          me = await api.me();
        } catch (e) {
          if (attempt === 1) throw e;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      setProfile(me!.profile);
      setPermissions(me!.permissions);
    } catch {
      // A session exists but the backend is unreachable: still reflect the
      // logged-in state from the session so login/sign-up visibly succeed.
      // (Admin features require the edge function and will light up once it's up.)
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (u) {
        const meta = (u.user_metadata ?? {}) as Record<string, string>;
        setProfile({
          id: u.id, email: u.email ?? "",
          username: meta.username || meta.full_name || meta.name || u.email?.split("@")[0] || "operator",
          region: meta.region || "GLOBAL", role: "HUMAN",
        });
        setPermissions([]);
      } else {
        setProfile(null);
        setPermissions([]);
      }
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await refresh();
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
    // Redirect happens; refresh runs on return via onAuthStateChange.
  };

  const signup = async (b: { email: string; password: string; username: string; region?: string }) => {
    // Client-side sign-up so account creation does not depend on the custom
    // edge function being reachable. The backend auto-provisions the profile
    // (and promotes the first-ever user to GOD) on the next /me call.
    const { data, error } = await supabase.auth.signUp({
      email: b.email,
      password: b.password,
      options: { data: { username: b.username, region: b.region ?? "GLOBAL" } },
    });
    if (error) throw new Error(error.message);

    if (data.session) {
      await refresh();
      return;
    }
    // No session returned → email confirmation is enabled on the project. Try a
    // direct password login; if that also fails, surface a clear message.
    try {
      await login(b.email, b.password);
    } catch {
      throw new Error(
        "Account created, but email confirmation is required. Disable 'Confirm email' in Supabase Auth settings, or confirm via the email link, then log in.",
      );
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPermissions([]);
  };

  const can = (perm: string) => permissions.includes(perm);

  return (
    <AuthContext.Provider value={{ profile, permissions, loading, login, loginWithGoogle, signup, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
