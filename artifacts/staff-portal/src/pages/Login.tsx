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
    <div dir="rtl" className="ed-login min-h-[100dvh] overflow-hidden bg-[#07131b] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ed-login-glow ed-login-glow-one" />
        <div className="ed-login-glow ed-login-glow-two" />
        <div className="ed-login-grid" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1180px] items-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-24">
          {/* Robot and brand — pinned to the top of the panel on desktop */}
          <section className="order-2 flex min-h-[430px] flex-col items-center justify-center lg:order-1 lg:min-h-[620px] lg:justify-start lg:pt-10">
            <div className="relative flex w-full max-w-[560px] flex-col items-center">
              {/* Atmosphere rings — centered on the robot */}
              <div className="ed-robot-halo absolute top-1/2 h-[310px] w-[310px] -translate-y-1/2 rounded-full sm:h-[400px] sm:w-[400px]" />
              <div className="ed-robot-orbit absolute top-1/2 h-[285px] w-[285px] -translate-y-1/2 rounded-full sm:h-[370px] sm:w-[370px]" />

              {/* Robot + logo-on-chest composite */}
              <div className="relative z-10">
                <div className="absolute inset-8 rounded-full bg-[#38d6bd]/20 blur-3xl" />
                <RobotMascot variant="login" size="xl" animate />
              </div>
            </div>

            <div className="mt-8 text-center" style={ku}>
              <p className="text-[11px] font-bold tracking-[0.22em] text-[#e8bd62]" style={{ direction: "ltr" }}>
                E-DIWAN
              </p>
              <h1 className="mt-2 text-2xl font-extrabold text-[#f2f0e7] sm:text-3xl">
                سیستەمی ئی دیوان
              </h1>
              <p className="mt-2 text-sm font-medium text-[#91a9ab]">
                بەڕێوەبردنی پەروەردە
              </p>
            </div>
          </section>

          {/* Minimal login */}
          <section className="order-1 mx-auto w-full max-w-[420px] lg:order-2">
            <div className="ed-login-card rounded-[28px] p-6 sm:p-8">
              <div className="mb-8 text-center" style={ku}>
                <div className="mb-5 flex justify-center lg:hidden">
                  <div className="ed-logo-mark flex h-24 w-24 items-center justify-center rounded-[26px] p-3">
                    <img
                      src={`${import.meta.env.BASE_URL}logo.png`}
                      alt="لۆگۆی E-Diwan"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-[#e8bd62]" style={{ direction: "ltr" }}>
                  E-DIWAN PORTAL
                </p>
                <h2 className="text-3xl font-extrabold text-[#f5f2ea]">
                  چوونەژوورەوە
                </h2>
              </div>

              {error && (
                <div
                  data-testid="status-login-error"
                  className="mb-5 rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-center text-xs text-red-200"
                  style={ku}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="login-username"
                    className="mb-2 block text-sm font-extrabold text-[#c6d2cf]"
                    style={ku}
                  >
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
                      boxShadow: focused === "user" ? "0 0 0 4px rgba(86,205,184,.12)" : undefined,
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-sm font-extrabold text-[#c6d2cf]"
                    style={ku}
                  >
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
                      boxShadow: focused === "pass" ? "0 0 0 4px rgba(232,189,98,.12)" : undefined,
                    }}
                  />
                </div>

                <button
                  type="submit"
                  data-testid="button-login"
                  disabled={loading}
                  className="ed-login-button mt-2 flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-base font-extrabold transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                  style={ku}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#102b35]/25 border-t-[#102b35]" />
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

              <div className="mt-7 border-t border-white/[0.08] pt-5 text-center" style={ku}>
                <p className="text-[10px] text-[#789296]">
                  سیستەمی بەڕێوەبەرێتی پەروەردەی شارباژێڕ
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-[10px] text-[#627b80]" style={{ direction: "ltr" }}>
              Ahmad Samad © 2026
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}