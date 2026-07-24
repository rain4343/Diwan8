import React, { useState } from "react";
import {
  CalendarDays, Plus, CheckCircle2, XCircle, Clock,
  ClipboardList, Loader2, Trash2, FileText, ChevronDown,
  AlarmClock, BookOpen, Baby, Heart, MoreHorizontal, Stethoscope,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

// ── Leave type config ──────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: "annual",    label: "ئاسایی",       icon: CalendarDays,  color: "text-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  { value: "sick",      label: "نەخۆشی",       icon: Stethoscope,   color: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30" },
  { value: "study",     label: "خوێندن",       icon: BookOpen,      color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  { value: "maternity", label: "منداڵ بوون",   icon: Baby,          color: "text-pink-500",   bg: "bg-pink-500/10",   border: "border-pink-500/30" },
  { value: "nursing",   label: "دایکایەتی",    icon: Heart,         color: "text-fuchsia-500",bg: "bg-fuchsia-500/10",border: "border-fuchsia-500/30" },
  { value: "other",     label: "هیتر",         icon: MoreHorizontal,color: "text-slate-500",  bg: "bg-slate-500/10",  border: "border-slate-500/30" },
] as const;

type LeaveTypeValue = typeof LEAVE_TYPES[number]["value"];

const STATUS_CONFIG: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
  pending:  { label: "چاوەڕوان",   icon: Clock,        cls: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",   dot: "bg-amber-500" },
  approved: { label: "پەسەندکرا", icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400", dot: "bg-emerald-500" },
  rejected: { label: "ڕەتکرا",    icon: XCircle,      cls: "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400",       dot: "bg-rose-500" },
};

const TABS = [
  { id: "request", label: "داوای مۆڵەت",   icon: Plus },
  { id: "mine",    label: "داواکانی من",   icon: ClipboardList },
  { id: "all",     label: "هەموو داواکان", icon: FileText, adminOnly: true },
];

// ── Helpers ────────────────────────────────────────────────────────
function leaveTypeMeta(value: string) {
  return LEAVE_TYPES.find(t => t.value === value) ?? LEAVE_TYPES[LEAVE_TYPES.length - 1];
}

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

// ── Status Badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`} style={ku}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Leave Card ─────────────────────────────────────────────────────
function LeaveCard({
  leave, isAdmin, onDelete, onReview,
}: {
  leave: any; isAdmin: boolean;
  onDelete: (id: number) => void;
  onReview: (leave: any) => void;
}) {
  const meta = leaveTypeMeta(leave.leave_type);
  const Icon = meta.icon;
  const days = daysBetween(leave.start_date, leave.end_date);

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Color strip by type */}
      <div className={`h-1 w-full ${meta.bg.replace("/10", "/40")}`} style={{ background: undefined }} />
      <div className={`h-1 w-full bg-gradient-to-l ${
        meta.value === "annual" ? "from-blue-400 to-blue-600" :
        meta.value === "sick" ? "from-rose-400 to-rose-600" :
        meta.value === "study" ? "from-violet-400 to-violet-600" :
        meta.value === "maternity" ? "from-pink-400 to-pink-600" :
        meta.value === "nursing" ? "from-fuchsia-400 to-fuchsia-600" :
        "from-slate-400 to-slate-600"
      }`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Type + user */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} border ${meta.border}`}>
              <Icon className={`h-5 w-5 ${meta.color}`} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base">{meta.label}</p>
              {isAdmin && leave.user_name && (
                <p className="text-xs text-muted-foreground truncate">{leave.user_name}</p>
              )}
            </div>
          </div>
          <StatusBadge status={leave.status} />
        </div>

        {/* Dates */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-xl px-3 py-2.5 border border-border/40">
            <p className="text-[10px] text-muted-foreground mb-0.5">دەستپێکردن</p>
            <p className="text-sm font-semibold tabular-nums">{leave.start_date}</p>
          </div>
          <div className="bg-muted/30 rounded-xl px-3 py-2.5 border border-border/40">
            <p className="text-[10px] text-muted-foreground mb-0.5">کۆتایی</p>
            <p className="text-sm font-semibold tabular-nums">{leave.end_date}</p>
          </div>
          <div className={`rounded-xl px-3 py-2.5 border ${meta.bg} ${meta.border}`}>
            <p className="text-[10px] text-muted-foreground mb-0.5">ژمارەی رۆژ</p>
            <p className={`text-sm font-bold ${meta.color} tabular-nums`}>{days} رۆژ</p>
          </div>
        </div>

        {/* Notes */}
        {leave.notes && (
          <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">تێبینی: </span>
            <span className="text-foreground">{leave.notes}</span>
          </div>
        )}

        {/* Reviewer note */}
        {leave.reviewer_note && (
          <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">تێبینی بەڕێوەبەر: </span>
            <span>{leave.reviewer_note}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(leave.created_at), "yyyy/MM/dd")}
          </p>
          <div className="flex gap-2">
            {leave.status === "pending" && !isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-lg text-xs"
                onClick={() => onDelete(leave.id)}
              >
                <Trash2 className="h-3.5 w-3.5 ml-1" />
                هەڵوەشاندنەوە
              </Button>
            )}
            {leave.status === "pending" && isAdmin && (
              <Button
                size="sm"
                className="h-8 px-4 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={() => onReview(leave)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                پێداچوونەوە
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function Leaves() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = !!(user as any)?.is_system_admin;

  const [activeTab, setActiveTab] = useState("request");
  const [leaveType, setLeaveType] = useState<LeaveTypeValue>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Review dialog state
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");

  // ── Data ──
  const { data: leaves = [], isLoading } = useQuery<any[]>({
    queryKey: ["leaves"],
    queryFn: () => apiFetch("/leaves"),
  });

  const myLeaves = leaves.filter((l) => l.user_id === (user as any)?.id);
  const allLeaves = leaves;

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/leaves", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
      toast({ title: "داوای مۆڵەتەکەت نێردرا ✓" });
      setLeaveType("annual"); setStartDate(""); setEndDate(""); setNotes("");
      setActiveTab("mine");
    },
    onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/leaves/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leaves"] }); toast({ title: "داواکە سڕایەوە." }); },
    onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reviewer_note }: any) =>
      apiFetch(`/leaves/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reviewer_note }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
      toast({ title: "بڕیار تۆمارکرا ✓" });
      setReviewTarget(null); setReviewNote("");
    },
    onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!startDate || !endDate) return toast({ title: "تکایە بەرواری دەستپێکردن و کۆتایی دیاری بکە.", variant: "destructive" });
    if (startDate > endDate) return toast({ title: "بەرواری دەستپێکردن نابێت لە کۆتایی دواتر بێت.", variant: "destructive" });
    if (leaveType === "other" && !notes.trim()) return toast({ title: "تکایە تێبینی بنووسە بۆ جۆری «هیتر».", variant: "destructive" });
    createMutation.mutate({ leave_type: leaveType, start_date: startDate, end_date: endDate, notes: notes || undefined });
  };

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6" style={ku} dir="rtl">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-emerald-600 via-teal-600 to-teal-700 p-6 shadow-xl">
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white/5 translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <AlarmClock className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-emerald-200 text-xs font-medium mb-1">E-Diwan</p>
            <h1 className="text-2xl font-bold text-white">مۆڵەتەکان</h1>
            <p className="text-emerald-200 text-sm mt-0.5">داوای مۆڵەت بکە و مامەڵەی لێوەبکە</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit border border-border/60">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const pendingCount = tab.id === "all"
            ? allLeaves.filter(l => l.status === "pending").length
            : tab.id === "mine"
            ? myLeaves.filter(l => l.status === "pending").length
            : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? "bg-background text-foreground shadow-sm border border-border/60"
                         : "text-muted-foreground hover:text-foreground"
              }`}
              style={ku}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: داوای مۆڵەت ── */}
      {activeTab === "request" && (
        <div className="max-w-2xl space-y-6">

          {/* Step 1: Type */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">١ — جۆری مۆڵەت هەڵبژێرە</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LEAVE_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = leaveType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => { setLeaveType(t.value); if (t.value !== "other") setNotes(""); }}
                    className={`flex flex-col items-center gap-2.5 rounded-2xl p-4 border-2 transition-all font-medium text-sm ${
                      isSelected
                        ? `${t.bg} ${t.border} ${t.color} shadow-sm scale-[1.02]`
                        : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                    style={ku}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isSelected ? `${t.bg} border ${t.border}` : "bg-muted/60"
                    }`}>
                      <Icon className={`h-5 w-5 ${isSelected ? t.color : "text-muted-foreground"}`} />
                    </div>
                    {t.label}
                    {isSelected && <span className={`w-2 h-2 rounded-full ${t.bg.replace("/10", "")} ${t.color.replace("text-", "bg-")}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Dates */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">٢ — بەروارەکان دیاری بکە</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" style={ku}>دەستپێکردن</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="rounded-xl border-border/70 h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" style={ku}>کۆتایی</label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="rounded-xl border-border/70 h-10"
                />
              </div>
            </div>
            {startDate && endDate && startDate <= endDate && (
              <div className="mt-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-2.5 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400" style={ku}>
                  کۆی ژمارەی رۆژ: {daysBetween(startDate, endDate)} رۆژ
                </span>
              </div>
            )}
          </div>

          {/* Step 3: Notes (always visible, required for "other") */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">٣ — تێبینی</p>
            {leaveType === "other" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                بۆ جۆری «هیتر» تێبینی پێویستە — تکایە ئاماژە بە هۆکارەکە بدە
              </p>
            )}
            {leaveType !== "other" && (
              <p className="text-xs text-muted-foreground mb-3">(دڵخوازی) — هەر زانیارییەکی زیادە بنووسە</p>
            )}
            <Textarea
              placeholder={leaveType === "other" ? "تکایە هۆکاری مۆڵەتەکە بنووسە..." : "تێبینی زیادە (دڵخوازی)..."}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="rounded-xl border-border/70 resize-none text-right"
              style={ku}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full h-12 rounded-2xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            style={ku}
          >
            {createMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />دەنێرێت...</>
              : <><Plus className="h-5 w-5 ml-2" />ناردنی داوای مۆڵەت</>
            }
          </Button>
        </div>
      )}

      {/* ── Tab: داواکانی من ── */}
      {activeTab === "mine" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myLeaves.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl py-20 flex flex-col items-center gap-4 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <AlarmClock className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div>
                <p className="font-semibold">هیچ داوایەکت نییە</p>
                <p className="text-sm text-muted-foreground mt-1">داوای مۆڵەتی نوێ بنێرە.</p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => setActiveTab("request")} style={ku}>
                <Plus className="h-4 w-4 ml-2" />داوای مۆڵەت بکە
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myLeaves.map(l => (
                <LeaveCard
                  key={l.id} leave={l} isAdmin={false}
                  onDelete={id => deleteMutation.mutate(id)}
                  onReview={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: هەموو داواکان (admin) ── */}
      {activeTab === "all" && isAdmin && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : allLeaves.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl py-20 flex flex-col items-center gap-4 text-center shadow-sm">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">هیچ داوایەک نەدۆزرایەوە.</p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "چاوەڕوان", count: allLeaves.filter(l => l.status === "pending").length,  color: "text-amber-600",   bg: "bg-amber-500/10",   icon: Clock },
                  { label: "پەسەندکرا", count: allLeaves.filter(l => l.status === "approved").length, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 },
                  { label: "ڕەتکرا",    count: allLeaves.filter(l => l.status === "rejected").length, color: "text-rose-600",    bg: "bg-rose-500/10",    icon: XCircle },
                ].map(({ label, count, color, bg, icon: Icon }) => (
                  <div key={label} className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${color}`}>{count}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {allLeaves.map(l => (
                  <LeaveCard
                    key={l.id} leave={l} isAdmin={true}
                    onDelete={id => deleteMutation.mutate(id)}
                    onReview={leave => { setReviewTarget(leave); setReviewNote(""); }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Review Dialog ── */}
      <Dialog open={!!reviewTarget} onOpenChange={open => { if (!open) { setReviewTarget(null); setReviewNote(""); } }}>
        <DialogContent className="max-w-md rounded-2xl" style={ku}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base" style={ku}>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
              </div>
              پێداچوونەوەی داوای مۆڵەت
            </DialogTitle>
          </DialogHeader>

          {reviewTarget && (
            <div className="space-y-4 mt-1">
              {/* Info */}
              <div className="rounded-xl bg-muted/30 border border-border/50 px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">فەرمانبەر</span>
                  <span className="font-semibold">{reviewTarget.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">جۆری مۆڵەت</span>
                  <span className="font-semibold">{leaveTypeMeta(reviewTarget.leave_type).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">بەروار</span>
                  <span className="font-semibold tabular-nums">{reviewTarget.start_date} → {reviewTarget.end_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ژمارەی رۆژ</span>
                  <span className="font-bold text-emerald-600">{daysBetween(reviewTarget.start_date, reviewTarget.end_date)} رۆژ</span>
                </div>
                {reviewTarget.notes && (
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-muted-foreground block mb-0.5">تێبینی</span>
                    <span className="font-medium">{reviewTarget.notes}</span>
                  </div>
                )}
              </div>

              {/* Reviewer note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" style={ku}>تێبینی بەڕێوەبەر (دڵخوازی)</label>
                <Textarea
                  placeholder="هەر تێبینییەک بنووسە..."
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  className="rounded-xl border-border/70 resize-none text-right"
                  style={ku}
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ id: reviewTarget.id, status: "approved", reviewer_note: reviewNote })}
                  style={ku}
                >
                  {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 ml-1.5" />پەسەندکردن</>}
                </Button>
                <Button
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 font-semibold"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ id: reviewTarget.id, status: "rejected", reviewer_note: reviewNote })}
                  style={ku}
                >
                  {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 ml-1.5" />ڕەتکردنەوە</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
