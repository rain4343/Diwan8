import React, { useState } from "react";
import { Link } from "wouter";
import {
  Plus, Search, Eye, Trash2,
  FolderOpen, FileClock, CheckCircle2,
  MailOpen, Send, ArrowRightLeft, MapPin,
} from "lucide-react";
import { useListDocuments, getListDocumentsQueryKey, useDeleteDocument } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const statusOptions = ["نوێ", "لە پێداچوونەوەدایە", "پەسەندکراوە", "ڕەتکراوەتەوە", "کۆتاییهاتووە"];

type Direction = "هاتوو" | "ڕۆشتوو";

const TABS: { direction: Direction; label: string; icon: React.ElementType; color: string; activeBg: string; activeBorder: string; activeText: string; iconColor: string }[] = [
  {
    direction: "هاتوو",
    label: "نوسراوی هاتوو",
    icon: MailOpen,
    color: "text-sky-600",
    activeBg: "bg-sky-500/10",
    activeBorder: "border-sky-500",
    activeText: "text-sky-700 dark:text-sky-400",
    iconColor: "text-sky-500",
  },
  {
    direction: "ڕۆشتوو",
    label: "نوسراوی ڕۆشتوو",
    icon: Send,
    color: "text-violet-600",
    activeBg: "bg-violet-500/10",
    activeBorder: "border-violet-500",
    activeText: "text-violet-700 dark:text-violet-400",
    iconColor: "text-violet-500",
  },
];

function statusBadge(status: string) {
  if (status === "پەسەندکراوە")
    return "bg-emerald-500/12 text-emerald-700 border-emerald-500/25 dark:text-emerald-400";
  if (status === "ڕەتکراوەتەوە")
    return "bg-rose-500/12 text-rose-700 border-rose-500/25 dark:text-rose-400";
  if (status === "لە پێداچوونەوەدایە" || status.includes("ئاڕاستەکرا"))
    return "bg-amber-500/12 text-amber-700 border-amber-500/25 dark:text-amber-400";
  if (status === "کۆتاییهاتووە")
    return "bg-slate-500/12 text-slate-600 border-slate-500/25";
  return "bg-violet-500/12 text-violet-700 border-violet-500/25 dark:text-violet-400";
}

export default function Documents() {
  const [activeTab, setActiveTab] = useState<Direction>("هاتوو");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const tab = TABS.find((t) => t.direction === activeTab)!;

  const queryParams = {
    direction: activeTab,
    ...(search && { search }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  };

  const { data: documents, isLoading, refetch } = useListDocuments(queryParams, {
    query: { queryKey: getListDocumentsQueryKey(queryParams) },
  });

  const deleteMutation = useDeleteDocument({
    mutation: {
      onSuccess: () => { toast({ title: "نوسراوەکە بە سەرکەوتوویی سڕایەوە." }); refetch(); setDeleteId(null); },
      onError: (err: any) => { toast({ title: "هەڵە لە سڕینەوە.", description: err.message, variant: "destructive" }); setDeleteId(null); },
    },
  });

  const total = documents?.length ?? 0;
  const approved = documents?.filter((d) => d.current_status === "پەسەندکراوە").length ?? 0;
  const pending = documents?.filter((d) => d.current_status === "لە پێداچوونەوەدایە").length ?? 0;

  return (
    <div className="space-y-6" data-testid="page-documents" style={ku}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl p-2.5 shadow-md ${activeTab === "هاتوو" ? "bg-gradient-to-br from-sky-500 to-sky-700 shadow-sky-500/20" : "bg-gradient-to-br from-violet-500 to-violet-700 shadow-violet-500/20"}`}>
            <tab.icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">نوسراوە فەرمیەکانی ب.پ.شارباژێڕ</p>
          </div>
        </div>
        <Button asChild className={`gap-2 shadow-sm rounded-xl h-10 px-5 text-white ${activeTab === "هاتوو" ? "bg-sky-600 hover:bg-sky-700" : "bg-violet-600 hover:bg-violet-700"}`}>
          <Link href="/documents/new">
            <Plus className="h-4 w-4" />
            زیادکردنی نوسراوی نوێ
          </Link>
        </Button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => {
          const isActive = t.direction === activeTab;
          return (
            <button
              key={t.direction}
              onClick={() => { setActiveTab(t.direction); setSearch(""); setStatusFilter("all"); }}
              className={`flex items-center gap-2.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                isActive
                  ? `${t.activeBorder} ${t.activeText} ${t.activeBg}`
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              style={ku}
            >
              <t.icon className={`h-4 w-4 ${isActive ? t.iconColor : ""}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Stat cards ── */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "کۆی نوسراوەکان", value: total, icon: FolderOpen, color: activeTab === "هاتوو" ? "text-sky-600" : "text-violet-600", bg: activeTab === "هاتوو" ? "bg-sky-500/10" : "bg-violet-500/10" },
            { label: "لە پێداچوونەوەدایە", value: pending, icon: FileClock, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: "پەسەندکراوەکان", value: approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
              <div className={`${bg} rounded-xl p-2 shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="گەڕان بە بابەت..."
            className="pr-9 text-right bg-background rounded-xl border-border/70 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={ku}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[210px] bg-background rounded-xl border-border/70 h-10" style={ku}>
            <SelectValue placeholder="دۆخی نوسراو" />
          </SelectTrigger>
          <SelectContent style={ku}>
            <SelectItem value="all">هەموو دۆخەکان</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3.5 font-semibold text-right text-xs text-muted-foreground uppercase tracking-wide">ژ. نوسراو</th>
                <th className="px-5 py-3.5 font-semibold text-right text-xs text-muted-foreground uppercase tracking-wide">ڕێکەوت</th>
                <th className="px-5 py-3.5 font-semibold text-right text-xs text-muted-foreground uppercase tracking-wide">بابەت</th>
                <th className="px-5 py-3.5 font-semibold text-right text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">دروستکەر</th>
                <th className="px-5 py-3.5 font-semibold text-right text-xs text-muted-foreground uppercase tracking-wide">دۆخ</th>
                <th className="px-5 py-3.5 font-semibold text-right text-xs text-muted-foreground uppercase tracking-wide">کردار</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className={`h-8 w-8 rounded-full border-2 border-t-transparent animate-spin ${activeTab === "هاتوو" ? "border-sky-400" : "border-violet-400"}`} />
                      <span className="text-sm">چاوەڕێ بکە...</span>
                    </div>
                  </td>
                </tr>
              ) : !documents?.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-2xl bg-muted/60 p-5">
                        <tab.icon className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">هیچ {tab.label}ێک نەدۆزرایەوە</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {search || statusFilter !== "all" ? "گۆڕانکاری لە فلتەرەکان بکە" : "نوسراوی نوێ زیاد بکە"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/25 transition-colors group"
                  >
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/documents/${doc.id}`}
                        className={`font-bold hover:underline underline-offset-2 transition-colors ${activeTab === "هاتوو" ? "text-sky-600 hover:text-sky-700" : "text-violet-600 hover:text-violet-700"}`}
                      >
                        {doc.document_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-right text-muted-foreground text-xs tabular-nums">
                      {format(new Date(doc.document_date), "yyyy/MM/dd")}
                    </td>
                    <td className="px-5 py-4 text-right max-w-[220px]">
                      <span className="truncate block text-foreground/90">{doc.subject}</span>
                    </td>
                    <td className="px-5 py-4 text-right text-muted-foreground text-xs hidden md:table-cell">
                      {doc.creator_name || "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {doc.current_status.startsWith("ئاڕاستەکرا بۆ:") ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-orange-500/10 text-orange-700 border-orange-400/30 dark:text-orange-400">
                            <ArrowRightLeft className="h-3 w-3 shrink-0" />
                            لە هۆبەدایە
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 dark:text-orange-400">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {doc.current_status.replace("ئاڕاستەکرا بۆ:", "").trim()}
                          </span>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusBadge(doc.current_status)}`}>
                          {doc.current_status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" asChild className={`h-8 rounded-lg text-xs gap-1.5 ${activeTab === "هاتوو" ? "hover:bg-sky-500/10 hover:text-sky-700" : "hover:bg-violet-500/10 hover:text-violet-700"}`} style={ku}>
                          <Link href={`/documents/${doc.id}`}>
                            <Eye className="h-3.5 w-3.5" /> بینین
                          </Link>
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setDeleteId(doc.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="سڕینەوەی نوسراو"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {documents && documents.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground text-right">
            کۆی <span className="font-semibold text-foreground">{documents.length}</span> نوسراو نیشاندراوە
          </div>
        )}
      </div>

      {/* ── Delete dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent style={ku} className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="rounded-xl bg-destructive/10 p-1.5">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              دڵنیایت لە سڕینەوە؟
            </AlertDialogTitle>
            <AlertDialogDescription>
              ئەم کردارە گەڕانەوەی نییە. نوسراوەکە و هەموو تۆمارەکانی بە تەواوی دەسڕێتەوە.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel style={ku} className="rounded-xl">پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              disabled={deleteMutation.isPending}
              style={ku}
            >
              {deleteMutation.isPending ? "چاوەڕێ بکە..." : "سڕینەوە"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
