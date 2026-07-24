import React from "react";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetDepartmentBreakdown, getGetDepartmentBreakdownQueryKey,
  useGetRoleBreakdown, getGetRoleBreakdownQueryKey,
  useGetRecentStaff, getGetRecentStaffQueryKey,
} from "@workspace/api-client-react";
import { Users, Building2, Shield, CalendarDays, TrendingUp, Activity, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { RobotMascot } from "@/components/robots/RobotMascot";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const CHART_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee"];

/* ── Stat Card ── */
function StatCard({
  label, sublabel, value, loading, icon: Icon, accentColor, glowColor, delay = 0,
}: {
  label: string; sublabel: string; value?: number | string; loading?: boolean;
  icon: React.ElementType; accentColor: string; glowColor: string; delay?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-default slide-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-4 -right-4 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: glowColor, opacity: 0.15, filter: "blur(16px)" }}
      />
      {/* Bottom accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, opacity: 0.4 }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium mb-1" style={{ ...ku, color: "rgba(148,163,184,0.7)" }}>
            {label}
          </p>
          <div
            className="text-3xl font-black mb-1"
            style={{ color: accentColor, textShadow: `0 0 20px ${glowColor}` }}
          >
            {loading ? (
              <span
                className="inline-block w-16 h-8 rounded-lg animate-pulse"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            ) : (
              value ?? "—"
            )}
          </div>
          <p className="text-[11px]" style={{ ...ku, color: "rgba(100,116,139,0.9)" }}>
            {sublabel}
          </p>
        </div>
        <div
          className="rounded-xl p-2.5"
          style={{
            background: `${glowColor}22`,
            border: `1px solid ${accentColor}33`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}

/* ── Recent Staff Avatar ── */
function InitialAvatar({ name }: { name: string }) {
  const initials = name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("");
  const colors = [
    ["#2563eb", "#4f46e5"], ["#059669", "#0d9488"],
    ["#7c3aed", "#6d28d9"], ["#d97706", "#b45309"],
    ["#db2777", "#be185d"], ["#0891b2", "#0369a1"],
  ];
  const [a, b] = colors[name.charCodeAt(0) % colors.length];
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold shrink-0"
      style={{ background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: `0 0 10px ${a}55` }}
    >
      {initials || "?"}
    </span>
  );
}

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm"
      style={{
        background: "rgba(5,15,35,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
        fontFamily: "'Noto Kufi Arabic', sans-serif",
        color: "white",
      }}
    >
      <p className="font-semibold">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.value}</p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date();

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: deptBreakdown, isLoading: loadingDept } = useGetDepartmentBreakdown({ query: { queryKey: getGetDepartmentBreakdownQueryKey() } });
  const { data: roleBreakdown, isLoading: loadingRole } = useGetRoleBreakdown({ query: { queryKey: getGetRoleBreakdownQueryKey() } });
  const { data: recentStaff, isLoading: loadingRecent } = useGetRecentStaff({ query: { queryKey: getGetRecentStaffQueryKey() } });

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "بەیانی باش";
    if (h < 17) return "ڕۆژی باش";
    return "ئێوارەی باش";
  })();

  return (
    <div className="space-y-6" data-testid="page-dashboard" style={ku}>

      {/* ══ HERO BANNER ══ */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 slide-up"
        style={{
          background: "linear-gradient(135deg, rgba(10,20,50,0.97) 0%, rgba(15,30,70,0.97) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 0 60px rgba(59,130,246,0.08), 0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Mesh grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Radial glow top-left */}
        <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right, rgba(59,130,246,0.12) 0%, transparent 70%)" }} />
        {/* Radial glow bottom */}
        <div className="absolute bottom-0 left-0 w-60 h-60 pointer-events-none"
          style={{ background: "radial-gradient(circle at bottom left, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />

        <div className="relative flex flex-col lg:flex-row items-center gap-6">
          {/* Left: Text */}
          <div className="flex-1 text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Activity className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium" style={ku}>سیستەمی E-Diwan</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white mb-1" style={ku}>
              {greeting}،
            </h1>
            <h2 className="text-xl font-extrabold mb-3" style={{ ...ku, color: "#60a5fa" }}>
              {user?.full_name || user?.username}
            </h2>
            <p className="text-sm text-white/50 mb-4" style={ku}>
              {format(today, "EEEE, dd MMMM yyyy")}
            </p>

          </div>

          {/* Right: cinematic document handoff */}
          <div className="dashboard-handoff relative shrink-0" data-testid="dashboard-document-handoff">
            <div className="dashboard-handoff-glow" />

            <div className="relative flex items-end justify-center">
              {/* Left robot */}
              <div className="dashboard-handoff-robot dashboard-handoff-robot-left flex flex-col items-center">
                <RobotMascot variant="documents" size="md" animate />
                <div className="dashboard-robot-shadow" />
              </div>

              {/* Center: beam + floating document */}
              <div className="relative z-10 flex flex-col items-center" style={{ marginBottom: "8px" }}>
                {/* Energy beam with travelling dots */}
                <div className="dashboard-energy-beam">
                  <div className="dashboard-energy-dot" style={{ animationDelay: "0ms" }} />
                  <div className="dashboard-energy-dot" style={{ animationDelay: "400ms" }} />
                  <div className="dashboard-energy-dot" style={{ animationDelay: "800ms" }} />
                </div>

                {/* Floating document card */}
                <div className="dashboard-handoff-document relative flex h-28 w-24 shrink-0 flex-col items-center justify-center rounded-2xl" style={{ marginTop: "-6px" }}>
                  <div className="dashboard-document-paper absolute inset-2 rounded-xl" />
                  <div className="dashboard-document-scan absolute inset-x-3 rounded" />
                  <FileText className="relative z-10 h-7 w-7 text-amber-300" />
                  <span className="relative z-10 mt-1 text-[10px] font-bold text-white/80" style={ku}>نوسراو</span>
                  <span className="relative z-10 mt-1 text-[9px] font-mono tracking-widest" style={{ color: "rgba(56,211,203,0.75)", direction: "ltr" }}>
                    E-DIWAN
                  </span>
                </div>
                <div className="dashboard-doc-shadow" />
              </div>

              {/* Right robot */}
              <div className="dashboard-handoff-robot dashboard-handoff-robot-right flex flex-col items-center">
                <RobotMascot variant="staff" size="md" animate />
                <div className="dashboard-robot-shadow" />
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] font-bold tracking-[0.2em]" style={{ color: "rgba(56,211,203,0.6)", direction: "ltr" }}>
              DOCUMENT HANDOFF
            </p>
          </div>
        </div>
      </div>

      {/* ══ STAT CARDS ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="کۆی فەرمانبەران" sublabel="فەرمانبەری خزمەتگزار"
          value={summary?.total_staff} loading={loadingSummary}
          icon={Users} accentColor="#60a5fa" glowColor="rgba(59,130,246,0.6)" delay={0}
        />
        <StatCard
          label="هۆبەکان" sublabel="بەشی خزمەت"
          value={summary?.total_departments} loading={loadingSummary}
          icon={Building2} accentColor="#34d399" glowColor="rgba(16,185,129,0.6)" delay={60}
        />
        <StatCard
          label="ئەرکەکان" sublabel="جۆری دەسەڵات"
          value={summary?.total_roles} loading={loadingSummary}
          icon={Shield} accentColor="#a78bfa" glowColor="rgba(139,92,246,0.6)" delay={120}
        />
        <StatCard
          label="کارمەندی نوێ" sublabel="ئەم مانگە"
          value={summary?.new_this_month} loading={loadingSummary}
          icon={TrendingUp} accentColor="#fbbf24" glowColor="rgba(245,158,11,0.6)" delay={180}
        />
      </div>

      {/* ══ CHARTS ROW ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Bar Chart */}
        <div
          className="rounded-2xl p-5 slide-up"
          style={{
            animationDelay: "200ms",
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3 mb-4" dir="rtl">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}
            >
              <Building2 className="h-4 w-4" style={{ color: "#34d399" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white" style={ku}>داڕشتنی هۆبەکان</h3>
              <p className="text-[11px]" style={{ ...ku, color: "rgba(100,116,139,0.8)" }}>فەرمانبەر بە هۆبە</p>
            </div>
          </div>
          {loadingDept ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            </div>
          ) : !deptBreakdown?.length ? (
            <div className="h-52 flex items-center justify-center text-sm" style={{ color: "rgba(100,116,139,0.7)", fontFamily: "'Noto Kufi Arabic',sans-serif" }}>
              زانیاری نییە
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptBreakdown} barSize={14} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <XAxis
                  dataKey="department_name"
                  tick={{ fontSize: 10, fill: "rgba(148,163,184,0.7)", fontFamily: "'Noto Kufi Arabic',sans-serif" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(100,116,139,0.6)" }}
                  axisLine={false} tickLine={false} allowDecimals={false}
                />
                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {deptBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Role Pie Chart */}
        <div
          className="rounded-2xl p-5 slide-up"
          style={{
            animationDelay: "260ms",
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3 mb-4" dir="rtl">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <Shield className="h-4 w-4" style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white" style={ku}>داڕشتنی ئەرکەکان</h3>
              <p className="text-[11px]" style={{ ...ku, color: "rgba(100,116,139,0.8)" }}>فەرمانبەر بە ئەرک</p>
            </div>
          </div>
          {loadingRole ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            </div>
          ) : !roleBreakdown?.length ? (
            <div className="h-52 flex items-center justify-center text-sm" style={{ color: "rgba(100,116,139,0.7)", fontFamily: "'Noto Kufi Arabic',sans-serif" }}>
              زانیاری نییە
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={roleBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="role_name"
                >
                  {roleBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "rgba(148,163,184,0.8)", fontSize: 11, fontFamily: "'Noto Kufi Arabic',sans-serif" }}>
                      {value}
                    </span>
                  )}
                />
                <RechartsTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ══ RECENT STAFF TABLE ══ */}
      <div
        className="rounded-2xl overflow-hidden slide-up"
        style={{
          animationDelay: "320ms",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          dir="rtl"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.2)" }}
            >
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white" style={ku}>نوێترین فەرمانبەران</h3>
              <p className="text-[11px]" style={{ ...ku, color: "rgba(100,116,139,0.8)" }}>دوایین فەرمانبەرانی زیادکراو</p>
            </div>
          </div>
          <Link href="/staff">
            <span className="text-xs font-medium cursor-pointer transition-colors hover:text-white" style={{ ...ku, color: "#60a5fa" }}>
              هەموو ببینە ←
            </span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={ku}>ناو</th>
                <th style={ku}>بەکارهێنەر</th>
                <th style={ku}>هۆبە</th>
                <th style={ku}>بەرواری</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecent ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j}>
                        <div
                          className="h-4 rounded-lg animate-pulse"
                          style={{ background: "rgba(255,255,255,0.05)", width: `${50 + j * 10}%`, marginRight: "auto" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !recentStaff?.length ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "48px 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <Users style={{ width: 32, height: 32, opacity: 0.15, color: "white" }} />
                      <span style={{ ...ku, color: "rgba(100,116,139,0.7)", fontSize: 14 }}>
                        هیچ فەرمانبەرێک نەدۆزرایەوە
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                recentStaff.map((staff, idx) => (
                  <tr key={staff.id} style={{ animationDelay: `${idx * 40}ms` }}>
                    <td>
                      <div className="flex items-center gap-2.5 justify-end">
                        <div className="text-right">
                          <div className="font-semibold text-white text-sm" style={ku}>{staff.full_name}</div>
                          <div className="text-[11px]" style={{ color: "rgba(100,116,139,0.8)" }}>{staff.email}</div>
                        </div>
                        <InitialAvatar name={staff.full_name} />
                      </div>
                    </td>
                    <td>
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.8)" }}
                      >
                        @{staff.username}
                      </span>
                    </td>
                    <td>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-medium"
                        style={{
                          background: "rgba(52,211,153,0.1)",
                          border: "1px solid rgba(52,211,153,0.2)",
                          color: "#34d399",
                          fontFamily: "'Noto Kufi Arabic',sans-serif",
                        }}
                      >
                        {staff.department_name || "بێ هۆبە"}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 justify-end text-xs" style={{ color: "rgba(100,116,139,0.8)" }}>
                        <CalendarDays className="h-3 w-3 opacity-50" />
                        {format(new Date(staff.created_at), "MMM d, yyyy")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
