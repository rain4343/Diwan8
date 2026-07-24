import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { RobotMascot } from "@/components/robots/RobotMascot";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<"user" | "pass" | null>(null);

  useEffect(() => {
    document.title = "E-Diwan | چوونەژوورەوە";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "هەڵەیەک ڕوویدا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="ed-login min-h-[100dvh] overflow-hidden text-white">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ed-login-glow ed-login-glow-one" />
        <div className="ed-login-glow ed-login-glow-two" />
        <div className="ed-login-glow ed-login-glow-three" />
        <div className="ed-login-grid" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">

        {/* ── Brand: logo + robot side by side ── */}
        <div className="mb-6 flex items-center justify-center gap-5">
          {/* Logo */}
          <div className="ed-login-brand-logo flex h-28 w-28 shrink-0 items-center justify-center rounded-[28px] p-3 sm:h-32 sm:w-32 sm:p-3.5">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="لۆگۆی بەڕێوەبەرایەتی پەروەردەی شاربازێڕ"
              className="h-full w-full object-contain"
            />
          </div>

          {/* Robot */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 -m-4 rounded-full bg-[#38d6bd]/10 blur-2xl" />
            <RobotMascot variant="login" size="lg" animate />
          </div>
        </div>

        {/* ── Portal label ── */}
        <div className="mb-7 text-center" style={ku}>
          <p className="text-[11px] font-extrabold tracking-[0.28em] text-[#f5d681]" style={{ direction: "ltr" }}>
            E-DIWAN PORTAL
          </p>
          <p className="mt-1 text-[15px] font-extrabold text-[#34d399]">
            بەڕێوەبەرێتی پەروەردەی شارباژێڕ
          </p>
        </div>

        {/* ── Login card ── */}
        <div className="ed-login-card w-full max-w-[400px] rounded-[28px] p-7 sm:p-9">
          <div className="mb-7 text-center" style={ku}>
            <h2 className="text-[1.85rem] font-extrabold leading-tight text-white">
              چوونەژوورەوە
            </h2>
          </div>

          {error && (
            <div
              data-testid="status-login-error"
              className="mb-5 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-center text-xs text-red-200"
              style={ku}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="mb-2 block text-sm font-extrabold text-[#d4f0ea]" style={ku}>
                ناوی بەکارهێنەر
              </label>
              <input
                id="login-username"
                data-testid="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocused("user")}
                onBlur={() => setFocused(null)}
                required
                autoComplete="username"
                placeholder="ناوی بەکارهێنەر"
                className="ed-login-input w-full rounded-xl px-4 py-3.5 text-base outline-none transition-all"
                style={{
                  ...ku,
                  borderColor: focused === "user" ? "#56cdb8" : undefined,
                  boxShadow: focused === "user" ? "0 0 0 3px rgba(86,205,184,.18)" : undefined,
                }}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-extrabold text-[#d4f0ea]" style={ku}>
                ووشەی نهێنی
              </label>
              <input
                id="login-password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("pass")}
                onBlur={() => setFocused(null)}
                required
                autoComplete="current-password"
                placeholder="ووشەی نهێنی"
                className="ed-login-input w-full rounded-xl px-4 py-3.5 text-base outline-none transition-all"
                style={{
                  ...ku,
                  borderColor: focused === "pass" ? "#e8bd62" : undefined,
                  boxShadow: focused === "pass" ? "0 0 0 3px rgba(232,189,98,.18)" : undefined,
                }}
              />
            </div>

            <button
              type="submit"
              data-testid="button-login"
              disabled={loading}
              className="ed-login-button mt-1 flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-base font-extrabold transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
              style={ku}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#102b35]/30 border-t-[#102b35]" />
                  چاوەڕێ بکە...
                </>
              ) : (
                <>
                  چوونەژوورەوە
                  <span aria-hidden="true">←</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] font-bold text-[#7aada6]/70" style={{ direction: "ltr" }}>
          Ahmad Samad © 2026
        </p>
      </main>
    </div>
  );
}
