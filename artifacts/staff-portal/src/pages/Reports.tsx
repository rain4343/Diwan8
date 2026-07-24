import React, { useState } from "react";
import {
  BarChart3, Download, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, FileText, Building2, ChevronRight, ArrowUpRight, Layers,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, CartesianGrid,
} from "recharts";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const STEP_LABELS: Record<string, string> = {
  draft: "پێشنووس",
  sent: "نێردراو",
  received: "وەرگیراو",
  review: "پێداچوونەوە",
  assigned: "سپاردراو",
  completed: "تەواوبوو",
  rejected: "ڕەتکراوە",
};

const STEP_COLORS: Record<string, string> = {
  draft: "#8b5cf6",
  sent: "#3b82f6",
  received: "#06b6d4",
  review: "#f59e0b",
  assigned: "#f97316",
  completed: "#10b981",
  rejected: "#ef4444",
};

const DEPT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

const TABS = [
  { id: "overview", label: "پوختەی گشتی", icon: Layers },
  { id: "departments", label: "بەپێی هۆبە", icon: Building2 },
  { id: "overdue", label: "دواخراوەکان", icon: AlertTriangle },
];

// ─── Custom Tooltip ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-border bg-card shadow-lg px-4 py-3 text-sm"
      style={ku}
    >
      {label && <p className="font-semibold mb-1.5 text-foreground">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────
function KpiCard({
  label, value, sublabel, icon: Icon, gradient, trend,
}: {
  label: string; value: number | string; sublabel?: string;
  icon: any; gradient: string; trend?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md ${gradient}`}>
      <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-white/8" />
      <div className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full bg-white/8" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="h-5 w-5 text-white" />
          </div>
          {trend && (
            <span className="flex items-center gap-0.5 text-xs font-medium bg-white/20 rounded-full px-2.5 py-1">
              <TrendingUp className="h-3 w-3" />{trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold mb-0.5">{value}</p>
        <p className="text-white/70 text-xs font-medium">{label}</p>
        {sublabel && <p className="text-white/50 text-[11px] mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, color }: { icon: any; title: string; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="font-bold text-base">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: docStats, isLoading: loadingDoc } = useQuery<any>({
    queryKey: ["reports", "documents"],
    queryFn: () => apiFetch("/reports/documents"),
  });

  const { data: deptStats = [], isLoading: loadingDept } = useQuery<any[]>({
    queryKey: ["reports", "departments"],
    queryFn: () => apiFetch("/reports/departments"),
  });

  const { data: overdueList = [], isLoading: loadingOverdue } = useQuery<any[]>({
    queryKey: ["reports", "overdue"],
    queryFn: () => apiFetch("/reports/overdue"),
  });

  // Derived chart data
  const stepData = docStats?.by_step
    ? Object.entries(docStats.by_step)
        .filter(([, count]) => Number(count) > 0)
        .map(([step, count]) => ({
          name: STEP_LABELS[step] ?? step,
          value: Number(count),
          step,
          fill: STEP_COLORS[step] ?? "#6366f1",
        }))
    : [];

  const deptChartData = deptStats
    .filter((d) => d.total_docs > 0)
    .slice(0, 8)
    .map((d) => ({
      name: d.dept_name ?? "?",
      تەواوبوو: d.completed ?? 0,
      چاوەڕوان: d.pending ?? 0,
      total: d.total_docs ?? 0,
    }));

  const completionRate =
    docStats?.total > 0
      ? Math.round(((docStats?.completed ?? 0) / docStats.total) * 100)
      : 0;

  return (
    <div className="space-y-6" style={ku} dir="rtl">

      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-indigo-600 via-indigo-700 to-violet-800 p-6 shadow-xl">
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white/5 translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-indigo-300" />
              <span className="text-indigo-300 text-xs font-medium">E-Diwan</span>
            </div>
            <h1 className="text-2xl font-bold text-white">ڕاپۆرتەکان</h1>
            <p className="text-indigo-300 text-sm mt-1">ئامار و شیکاری کاری سیستەم</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open("/api/reports/export", "_blank")}
              className="flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-medium py-2.5 px-4 text-sm transition-all"
            >
              <Download className="h-4 w-4" />
              داگرتنی CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="کۆی نوسراو"
          value={loadingDoc ? "—" : (docStats?.total ?? 0)}
          sublabel="هەموو نوسراوەکان"
          icon={FileText}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <KpiCard
          label="تەواوبووەکان"
          value={loadingDoc ? "—" : (docStats?.completed ?? 0)}
          sublabel={`ڕێژەی تەواوبوون ${completionRate}%`}
          icon={CheckCircle2}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          trend={`${completionRate}%`}
        />
        <KpiCard
          label="چاوەڕوانەکان"
          value={loadingDoc ? "—" : (docStats?.pending ?? 0)}
          sublabel="هێشتا ئیش بەسەردا دەکرێت"
          icon={Clock}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <KpiCard
          label="دواخراوەکان"
          value={loadingOverdue ? "—" : overdueList.length}
          sublabel="پێویستی بە چارەسەریان هەیە"
          icon={AlertTriangle}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit border border-border/60">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={ku}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id === "overdue" && overdueList.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {overdueList.length > 9 ? "9+" : overdueList.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Pie: by workflow step */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <SectionHeader
                icon={Layers}
                title="نوسراو بەپێی مەرحەلە"
                sub="دابەشبوونی نوسراوەکان لە نێوان مەرحەلەکاندا"
                color="bg-violet-500/10 text-violet-500"
              />
              {loadingDoc ? (
                <div className="h-[260px] flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stepData.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Layers className="h-10 w-10 opacity-20" />
                  <p className="text-sm">داتایەک نییە</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stepData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      innerRadius={62}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {stepData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bar: top departments */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <SectionHeader
                icon={Building2}
                title="تاپ هۆبەکان"
                sub="نوسراوی تەواوبوو و چاوەڕوان بەپێی هۆبە"
                color="bg-indigo-500/10 text-indigo-500"
              />
              {loadingDept ? (
                <div className="h-[260px] flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : deptChartData.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Building2 className="h-10 w-10 opacity-20" />
                  <p className="text-sm">داتایەک نییە</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={deptChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => v.length > 6 ? v.substring(0, 6) + "…" : v}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: 12 }}
                    />
                    <Bar dataKey="تەواوبوو" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="چاوەڕوان" fill="#6366f1" stackId="a" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Progress bars by step */}
          {!loadingDoc && stepData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <SectionHeader
                icon={TrendingUp}
                title="ئامارەکان بەپێی مەرحەلە"
                sub="ژمارەی نوسراو لە هەر مەرحەلەیەکدا"
                color="bg-emerald-500/10 text-emerald-500"
              />
              <div className="space-y-3">
                {stepData.map((entry) => (
                  <div key={entry.step} className="flex items-center gap-4">
                    <div className="w-20 text-right">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">{entry.name}</span>
                    </div>
                    <div className="flex-1 h-2.5 bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: docStats?.total ? `${(entry.value / docStats.total) * 100}%` : "0%",
                          background: entry.fill,
                        }}
                      />
                    </div>
                    <div className="w-14 text-left">
                      <span className="text-xs font-bold tabular-nums" style={{ color: entry.fill }}>
                        {entry.value}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({docStats?.total ? Math.round((entry.value / docStats.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Departments ── */}
      {activeTab === "departments" && (
        <div className="space-y-6">
          {/* Horizontal bar chart */}
          {!loadingDept && deptChartData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <SectionHeader
                icon={Building2}
                title="نوسراو بەپێی هۆبە"
                sub="بەراوردی هۆبەکان"
                color="bg-indigo-500/10 text-indigo-500"
              />
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptChartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={75}
                    tickFormatter={(v: string) => v.length > 8 ? v.substring(0, 8) + "…" : v}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: 12 }} />
                  <Bar dataKey="تەواوبوو" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  <Bar dataKey="چاوەڕوان" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Department table */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-indigo-500" />
              </div>
              <h2 className="font-semibold text-sm">خشتەی هۆبەکان</h2>
            </div>
            {loadingDept ? (
              <div className="py-16 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : deptStats.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <Building2 className="h-10 w-10 opacity-20" />
                <p className="text-sm">هیچ داتایەک نییە</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground text-xs border-b border-border/40">
                      <th className="px-6 py-3 text-right font-medium">#</th>
                      <th className="px-6 py-3 text-right font-medium">ناوی هۆبە</th>
                      <th className="px-6 py-3 text-right font-medium">کۆی نوسراو</th>
                      <th className="px-6 py-3 text-right font-medium">تەواوبوو</th>
                      <th className="px-6 py-3 text-right font-medium">چاوەڕوان</th>
                      <th className="px-6 py-3 text-right font-medium">پرۆگرێس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {deptStats.map((d: any, idx: number) => {
                      const rate = d.total_docs > 0 ? Math.round((d.completed / d.total_docs) * 100) : 0;
                      return (
                        <tr key={d.dept_id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-3.5 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="px-6 py-3.5 font-medium">{d.dept_name}</td>
                          <td className="px-6 py-3.5">
                            <span className="font-mono font-bold">{d.total_docs}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="h-3 w-3" />{d.completed}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">
                              <Clock className="h-3 w-3" />{d.pending}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-l from-emerald-400 to-emerald-600 rounded-full"
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-muted-foreground w-8 text-left">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Overdue ── */}
      {activeTab === "overdue" && (
        <div className="space-y-4">
          {loadingOverdue ? (
            <div className="py-20 flex justify-center">
              <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : overdueList.length === 0 ? (
            <div className="bg-card border border-emerald-500/30 rounded-2xl py-20 flex flex-col items-center gap-4 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">زۆر باشە!</p>
                <p className="text-sm text-muted-foreground mt-1">هیچ نوسراوێکی دواخراو نییە.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
                    {overdueList.length} نوسراوی دواخراو دۆزرایەوە
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {overdueList.map((d: any) => (
                  <div
                    key={d.deadline_id}
                    className="bg-card border border-rose-500/20 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-rose-500/40 transition-all shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded-md font-mono text-muted-foreground">
                          {d.document_number}
                        </code>
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <AlertTriangle className="h-3 w-3" />دواخراو
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{d.subject}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs text-muted-foreground">ئەنجامدان</p>
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">{d.due_date}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
