import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from "react";
import { supabase, api, type Profile } from "./supabase";

export type Role = "GOD" | "DEMI_GOD" | "HUMAN";

const DEMI_GOD_PERMS = [
  "tournaments.manage",
  "registrations.approve",
  "checkins.manage",
  "seeding.manage",
  "brackets.generate",
  "matches.resolve",
  "disputes.resolve",
  "announcements.publish",
  "roster.manage",
  "audit.view",
  "results.submit",
  "disputes.create",
  "seed.run",
];

const GOD_PERMS = [
  ...DEMI_GOD_PERMS,
  "admins.manage",
  "roles.manage",
];

const HUMAN_PERMS = ["results.submit", "disputes.create"];

function permissionsFor(role: Role): string[] {
  if (role === "GOD") return GOD_PERMS;
  if (role === "DEMI_GOD") return DEMI_GOD_PERMS;
  return HUMAN_PERMS;
}

type AuthState = {
  profile: Profile | null;
  effectiveRole: Role;
  availablePerspectives: Role[];
  permissions: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (b: { email: string; password: string; username: string; region?: string }) => Promise<void>;
  updateProfile: (b: { username: string; region?: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: string) => boolean;
  setPerspective: (role: Role) => void;
};

// Reuse a single context object across duplicate module evaluations so that
// AuthProvider and useAuth always share the same context (avoids the spurious
// "useAuth must be used within AuthProvider" under HMR / proxied previews).
const g = globalThis as unknown as { __vantaAuthCtx?: Context<AuthState | null> };
const AuthContext = g.__vantaAuthCtx ?? (g.__vantaAuthCtx = createContext<AuthState | null>(null));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [perspective, setPerspectiveState] = useState<Role | null>(() => {
    return (localStorage.getItem("vanta_perspective") as Role) || null;
  });
  const [loading, setLoading] = useState(true);

  // Compute effective role and available perspective options
  const actualRole: Role = profile?.role ?? "HUMAN";
  const availablePerspectives: Role[] =
    actualRole === "GOD"
      ? ["GOD", "DEMI_GOD", "HUMAN"]
      : actualRole === "DEMI_GOD"
      ? ["DEMI_GOD", "HUMAN"]
      : ["HUMAN"];

  const effectiveRole: Role =
    perspective && availablePerspectives.includes(perspective)
      ? perspective
      : actualRole;

  const permissions = permissionsFor(effectiveRole);

  function setPerspective(role: Role) {
    if (availablePerspectives.includes(role)) {
      setPerspectiveState(role);
      localStorage.setItem("vanta_perspective", role);
    }
  }

  async function refresh() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setProfile(null);
        return;
      }
      let me: { profile: Profile; permissions: string[] } | null = null;
      for (let attempt = 0; attempt < 2 && !me; attempt++) {
        try {
          me = await api.me();
        } catch (e) {
          if (attempt === 1) throw e;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      if (me?.profile) {
        setProfile(me.profile);
      }
    } catch {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (u) {
        const meta = (u.user_metadata ?? {}) as Record<string, string>;
        const emailLower = (u.email ?? "").toLowerCase().trim();
        const isGodAccount = emailLower === "raveends70@gmail.com";
        setProfile({
          id: u.id, email: u.email ?? "",
          username: meta.username || meta.full_name || meta.name || emailLower.split("@")[0] || "operator",
          region: meta.region || "GLOBAL",
          role: isGodAccount ? "GOD" : "HUMAN",
        });
      } else {
        setProfile(null);
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
  };

  const signup = async (b: { email: string; password: string; username: string; region?: string }) => {
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
    try {
      await login(b.email, b.password);
    } catch {
      throw new Error(
        "Account created, but email confirmation is required. Disable 'Confirm email' in Supabase Auth settings, or confirm via the email link, then log in.",
      );
    }
  };

  const updateProfile = async (b: { username: string; region?: string }) => {
    try {
      const { profile: updated } = await api.updateProfile(b);
      setProfile(updated);
    } catch (e) {
      // Fallback local update if offline
      setProfile((prev) => (prev ? { ...prev, ...b } : prev));
      throw e;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPerspectiveState(null);
    localStorage.removeItem("vanta_perspective");
  };

  const can = (perm: string) => permissions.includes(perm);

  return (
    <AuthContext.Provider
      value={{
        profile,
        effectiveRole,
        availablePerspectives,
        permissions,
        loading,
        login,
        loginWithGoogle,
        signup,
        updateProfile,
        logout,
        can,
        setPerspective,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
