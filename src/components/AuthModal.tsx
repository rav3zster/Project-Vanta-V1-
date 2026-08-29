import { useState } from "react";
import { useAuth } from "../lib/auth";
import { brand } from "../config/brand";
import { Mono } from "./ui";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, loginWithGoogle, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [region, setRegion] = useState("GLOBAL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await signup({ email, password, username, region });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
      // Browser redirects to Google; on return the session is restored.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const field =
    "w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-border-strong";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="grain relative w-full max-w-md border border-border-strong bg-surface p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10">
          <div className="font-display text-2xl font-black tracking-tight">{brand.publicName}</div>
          <Mono className="mt-1 block">
            {mode === "login" ? "ENTER THE PROJECT" : "REQUEST ACCESS"}
          </Mono>

          <button
            onClick={google}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-3 border border-border-strong bg-background py-3 font-mono text-xs tracking-[0.15em] text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            CONTINUE WITH GOOGLE
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <Mono className="text-border-strong">OR</Mono>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input className={field} placeholder="USERNAME" value={username} onChange={(e) => setUsername(e.target.value)} required />
            )}
            <input className={field} type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={field} type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {mode === "signup" && (
              <select className={field} value={region} onChange={(e) => setRegion(e.target.value)}>
                {["GLOBAL", "APAC", "EU", "NA", "SA"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}

            {error && (
              <div className="border border-danger/40 bg-danger/5 px-3 py-2 font-mono text-[11px] text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-accent py-3 font-mono text-xs font-bold tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
            className="mt-4 font-mono text-[11px] tracking-[0.1em] text-muted transition-colors hover:text-foreground"
          >
            {mode === "login" ? "Don't have an account? Create one →" : "Have an account? Log in →"}
          </button>

        </div>
      </div>
    </div>
  );
}
