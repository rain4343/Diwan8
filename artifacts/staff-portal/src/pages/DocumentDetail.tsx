import React, { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useAuth, FORWARD_DOCUMENTS_ROLE } from "@/lib/auth";
import {
  ArrowRight, FileText, History, Plus, Download,
  ClipboardList, Send, Eye, Loader2, AlertTriangle,
  RefreshCw, Upload, Stamp, CheckCircle2, Clock,
  ArrowRightLeft, FileImage, FileType2, File, Tag, PenLine, MapPin,
} from "lucide-react";
import {
  useGetDocument, getGetDocumentQueryKey,
  useListDocumentLogs, getListDocumentLogsQueryKey,
  useCreateDocumentLog, useUpdateDocument, useForwardDocument,
  useListDepartments, getListDepartmentsQueryKey,
  useReplaceDocumentAttachment,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

function statusConfig(status: string) {
  if (status === "نوێ")
    return { cls: "bg-violet-500/12 text-violet-700 border-violet-500/25", dot: "bg-violet-500" };
  if (status.startsWith("ئاڕاستەکرا بۆ"))
    return { cls: "bg-orange-500/12 text-orange-700 border-orange-500/30", dot: "bg-orange-500" };
  if (status === "پەسەندکراوە")
    return { cls: "bg-emerald-500/12 text-emerald-700 border-emerald-500/25", dot: "bg-emerald-500" };
  if (status === "ئیمزاکرا")
    return { cls: "bg-teal-500/12 text-teal-700 border-teal-500/25", dot: "bg-teal-500" };
  if (status === "ڕەتکراوەتەوە")
    return { cls: "bg-rose-500/12 text-rose-700 border-rose-500/25", dot: "bg-rose-500" };
  if (status === "کۆتاییهاتووە")
    return { cls: "bg-slate-500/12 text-slate-600 border-slate-500/25", dot: "bg-slate-400" };
  return { cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
}

function logActionConfig(action: string) {
  if (action.includes("ئاڕاستەکردن") || action.includes("ئاڕاستەکرا"))
    return { icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-500/10", ring: "ring-amber-500/20" };
  if (action === "تێبینی")
    return { icon: Plus, color: "text-blue-600", bg: "bg-blue-500/10", ring: "ring-blue-500/20" };
  if (action === "دروستکردن")
    return { icon: FileText, color: "text-violet-600", bg: "bg-violet-500/10", ring: "ring-violet-500/20" };
  if (action.includes("نوێکردنەوەی هاوپێچ"))
    return { icon: RefreshCw, color: "text-teal-600", bg: "bg-teal-500/10", ring: "ring-teal-500/20" };
  return { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted", ring: "ring-border" };
}

type AttachmentType = "pdf" | "image" | "word" | "other";

function attachmentMeta(type: AttachmentType) {
  if (type === "pdf") return { icon: FileText, color: "text-rose-600", bg: "bg-rose-500/10", label: "PDF" };
  if (type === "image") return { icon: FileImage, color: "text-blue-600", bg: "bg-blue-500/10", label: "وێنە" };
  if (type === "word") return { icon: FileType2, color: "text-sky-600", bg: "bg-sky-500/10", label: "Word" };
  return { icon: File, color: "text-muted-foreground", bg: "bg-muted", label: "فایل" };
}

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const { user } = useAuth();
  const isSuperAdmin = user?.id === 1;
  const canForward = isSuperAdmin || !!user?.roles?.includes(FORWARD_DOCUMENTS_ROLE);
  const documentId = Number(params?.id);

  const [note, setNote] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: document, isLoading: loadingDoc, refetch: refetchDoc } = useGetDocument(documentId, {
    query: { enabled: !!documentId, queryKey: getGetDocumentQueryKey(documentId) },
  });
  const { data: departments } = useListDepartments({
    query: { queryKey: getListDepartmentsQueryKey() },
  });
  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs } = useListDocumentLogs(documentId, {
    query: { enabled: !!documentId, queryKey: getListDocumentLogsQueryKey(documentId) },
  });

  const updateDocMutation = useUpdateDocument();

  const forwardDocMutation = useForwardDocument({
    mutation: {
      onSuccess: (_data, variables) => {
        const deptName = departments?.find((d) => d.id === variables.data.department_id)?.name ?? "";
        setNote(""); setSelectedDept("");
        toast({ title: "نووسراوەکە بە سەرکەوتوویی ئاڕاستەکرا.", description: deptName });
        refetchLogs(); refetchDoc();
      },
      onError: (err: any) => toast({ title: "هەڵە", description: err.message, variant: "destructive" }),
    },
  });

  const createLogMutation = useCreateDocumentLog({
    mutation: {
      onSuccess: () => { setNote(""); setSelectedDept(""); refetchLogs(); refetchDoc(); },
      onError: (err: any) => toast({ title: "هەڵە", description: err.message, variant: "destructive" }),
    },
  });

  const replaceAttachmentMutation = useReplaceDocumentAttachment({
    mutation: {
      onSuccess: () => {
        toast({ title: "هاوپێچی نووسراو بە سەرکەوتوویی نوێکرایەوە." });
        setReplaceOpen(false); setNewAttachment(null);
        refetchDoc(); refetchLogs();
      },
      onError: (err: any) => toast({ title: "هەڵە", description: err.message, variant: "destructive" }),
    },
  });

  const isPending = createLogMutation.isPending || updateDocMutation.isPending || forwardDocMutation.isPending;

  useEffect(() => {
    if (previewOpen) { setTimeout(() => setPreviewReady(true), 80); }
    else { setPreviewReady(false); }
  }, [previewOpen]);

  const documentFileUrl = document?.file_path ? `/api/documents/uploads/${document.file_path}` : null;
  const documentDownloadUrl = document?.id ? `/api/documents/${document.id}/download` : null;

  const attachmentType: AttachmentType = (() => {
    const ext = (document?.file_path ?? "").split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return "pdf";
    if (["jpg", "jpeg", "png"].includes(ext)) return "image";
    if (["doc", "docx"].includes(ext)) return "word";
    return "other";
  })();

  const addNote = () => {
    if (!note.trim()) return;
    createLogMutation.mutate(
      { id: documentId, data: { action: "تێبینی", notes: note || undefined } },
      { onSuccess: () => toast({ title: "تێبینی زیادکرا." }) }
    );
  };

  const routeToDepartment = () => {
    if (!selectedDept) return;
    forwardDocMutation.mutate({ id: documentId, data: { department_id: Number(selectedDept), notes: note || undefined } });
  };

  if (loadingDoc) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={ku}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-sm">چاوەڕێ بکە...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center" style={ku}>
        <div className="rounded-2xl bg-muted/60 p-6">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
        </div>
        <div>
          <h2 className="text-xl font-bold">نووسراوەکە نەدۆزرایەوە</h2>
          <p className="text-sm text-muted-foreground mt-1">ئەم نووسراوە بوونی نییە یان سڕدراوەتەوە.</p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/documents">گەڕانەوە بۆ نووسراوەکان</Link>
        </Button>
      </div>
    );
  }

  const sc = statusConfig(document.current_status);
  const aMeta = attachmentMeta(attachmentType);
  const AttachIcon = aMeta.icon;

  return (
    <div className="space-y-6" data-testid="page-document-detail" style={ku}>

      {/* ── Hero header ── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Accent stripe */}
        <div className="h-1 w-full bg-gradient-to-l from-violet-500 via-violet-400 to-violet-600" />
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl h-9 w-9 shrink-0">
              <Link href="/documents">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{document.subject}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <code className="text-xs bg-muted px-2 py-0.5 rounded-md font-mono text-muted-foreground">
                  {document.document_number}
                </code>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${sc.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                  {document.current_status}
                </span>
              </div>
            </div>
          </div>
          {/* Edit link */}
          <Button variant="outline" size="sm" asChild className="rounded-xl h-8 text-xs shrink-0 hidden sm:flex border-border/70">
            <Link href={`/documents/${document.id}/edit`}>دەستکاریکردن</Link>
          </Button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* ── Left column (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Document info card */}
          <Card className="rounded-2xl shadow-sm border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2" style={ku}>
                <FileText className="h-3.5 w-3.5" />
                زانیارییەکانی نووسراو
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "ژمارەی نووسراو", value: document.document_number, mono: true },
                  { label: "ڕێکەوت", value: format(new Date(document.document_date), "dd / MM / yyyy"), mono: true },
                  { label: "دروستکەر", value: document.creator_name || "—" },
                  { label: "بابەت", value: document.subject, span: true },
                ].map(({ label, value, mono, span }) => (
                  <div
                    key={label}
                    className={`rounded-xl bg-muted/30 border border-border/50 px-4 py-3 ${span ? "col-span-2" : ""}`}
                  >
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Attachment section */}
              {documentFileUrl && (
                <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                    <div className={`rounded-lg ${aMeta.bg} p-1.5 shrink-0`}>
                      <AttachIcon className={`h-4 w-4 ${aMeta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">هاوپێچ</p>
                      <p className="text-sm font-medium truncate">{aMeta.label}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 p-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 px-4 text-sm transition-colors shadow-sm shadow-violet-500/20"
                      style={ku}
                    >
                      <Eye className="h-4 w-4" />
                      بینینی هاوپێچ
                    </button>
                    {attachmentType === "pdf" && (
                      <Link
                        href={`/documents/${document.id}/sign`}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-3.5 text-sm transition-colors shadow-sm shadow-emerald-500/20"
                        title="ئیمزاکردن"
                      >
                        <PenLine className="h-4 w-4" />
                        ئیمزا
                      </Link>
                    )}
                    {documentDownloadUrl && (
                      <a
                        href={documentDownloadUrl}
                        download
                        title="داگرتنی هاوپێچ"
                        className="flex items-center justify-center rounded-xl border border-border/70 text-foreground hover:bg-muted py-2.5 px-3.5 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => { setNewAttachment(null); setReplaceOpen(true); }}
                      title="نوێکردنەوەی هاوپێچ"
                      className="flex items-center justify-center rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted py-2.5 px-3.5 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action card */}
          {canForward && (
            <Card className="rounded-2xl shadow-sm border-border/70">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2" style={ku}>
                  <ClipboardList className="h-3.5 w-3.5" />
                  کرداری نوێ: هامش و ئاڕاستەکردن
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5" style={ku}>
                    <Tag className="h-3 w-3" />
                    ئاڕاستەکردن بۆ بەش
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {departments?.map((dept) => {
                      const isSelected = selectedDept === String(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setSelectedDept(isSelected ? "" : String(dept.id))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            isSelected
                              ? "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/30 scale-105"
                              : "bg-background border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600 hover:bg-amber-500/5"
                          }`}
                          style={ku}
                        >
                          <Tag className={`h-3 w-3 ${isSelected ? "text-white" : ""}`} />
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDept && (
                    <p className="text-xs text-amber-600 font-medium" style={ku}>
                      ✓ {departments?.find((d) => String(d.id) === selectedDept)?.name} هەڵبژێردراوە
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
                    هامش
                  </label>
                  <Textarea
                    placeholder="تێبینییەک بنووسە..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-right rounded-xl bg-background border-border/70 resize-none"
                    style={ku}
                    rows={3}
                  />
                </div>

                {selectedDept && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20 px-3.5 py-3 text-xs text-blue-700 dark:text-blue-400" style={ku}>
                    <Stamp className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>کاتێک ئاڕاستەی بەش دەکەیت، هامشێکی فەرمی و ئیمزای ئەلیکترۆنیت بە شێوەیەکی ئۆتۆماتیکی دەخرێتە سەر ڕوکاری فایلی PDF ەکە.</span>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-1 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={addNote}
                    disabled={isPending || !note.trim()}
                    className="flex items-center gap-2 rounded-xl h-9 border-border/70"
                  >
                    {createLogMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    تێبینی
                  </Button>
                  <Button
                    onClick={routeToDepartment}
                    disabled={isPending || !selectedDept}
                    className="flex items-center gap-2 rounded-xl h-9 min-w-[120px] bg-violet-600 hover:bg-violet-700"
                  >
                    {forwardDocMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />دەخرێتە سەر PDF...</>
                    ) : (
                      <><Send className="h-4 w-4" />ئاڕاستەکردن</>
                    )}
                  </Button>
                </div>

                {/* ── Mark as completed ── */}
                {document.current_status !== "کۆتاییهاتووە" && (
                  <div className="border-t border-border/40 pt-4 mt-2">
                    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 px-3.5 py-3 mb-3 text-xs text-emerald-700 dark:text-emerald-400" style={ku}>
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>کاتێک نوسراوەکە هەموو ئیشەکانی تەواو بوو و گەڕایەوە هۆبەی دەرکردە و وەرگرتە، ئەمەی خوارەوە بکە.</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateDocMutation.mutate(
                          { id: documentId, data: { current_status: "کۆتاییهاتووە" } },
                          {
                            onSuccess: () => {
                              toast({ title: "نوسراوەکە تەواوبوو بە سەرکەوتوویی تۆمارکرا." });
                              refetchDoc(); refetchLogs();
                            },
                            onError: (err: any) => toast({ title: "هەڵە", description: err.message, variant: "destructive" }),
                          }
                        );
                      }}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 rounded-xl h-9 border-emerald-400/50 text-emerald-700 hover:bg-emerald-500/10 hover:border-emerald-500 dark:text-emerald-400"
                      style={ku}
                    >
                      {updateDocMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      نوسراوەکە تەواوبوو — گەڕایەوە هۆبەکان
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column (1/3): timeline history ── */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="rounded-2xl shadow-sm border-border/70 h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2" style={ku}>
                <History className="h-3.5 w-3.5" />
                مێژووی جووڵەی نووسراو
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                </div>
              ) : !logs?.length ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <Clock className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">هیچ جووڵەیەک تۆمار نەکراوە.</p>
                </div>
              ) : (
                <ul className="relative space-y-0">
                  {/* Vertical timeline line */}
                  <div className="absolute right-[19px] top-5 bottom-5 w-px bg-border/60" aria-hidden />
                  {logs.map((log, idx) => {
                    const cfg = logActionConfig(log.action);
                    const Icon = cfg.icon;
                    return (
                      <li key={log.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {/* Icon dot */}
                        <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg} ring-2 ${cfg.ring} ring-offset-background ring-offset-1`}>
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-sm font-semibold leading-snug">{log.action}</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {log.user_name && (
                              <span className="text-xs text-muted-foreground">
                                لەلایەن: <span className="font-medium text-foreground/80">{log.user_name}</span>
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {format(new Date(log.timestamp), "yyyy/MM/dd — hh:mm a")}
                            </span>
                          </div>
                          {log.notes && (
                            <div className="mt-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs leading-relaxed">
                              <span className="font-semibold text-muted-foreground">هامش: </span>
                              <span>{log.notes}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Preview modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[88vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden" style={ku}>
          <DialogHeader className="px-5 py-4 border-b bg-card shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-sm" style={ku}>
              <div className={`rounded-lg ${aMeta.bg} p-1.5`}>
                <AttachIcon className={`h-4 w-4 ${aMeta.color}`} />
              </div>
              <span>پیشاندانی هاوپێچ — {document.document_number}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 relative bg-muted/20">
            {!previewReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="h-7 w-7 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                <p className="text-sm">چاوەڕێ بکە...</p>
              </div>
            ) : documentFileUrl ? (
              <>
                {attachmentType === "pdf" && (
                  <object
                    data={documentFileUrl}
                    type="application/pdf"
                    className="absolute inset-0 w-full h-full"
                    aria-label="پیشاندانی هاوپێچ (PDF)"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={ku}>
                      <div className="rounded-2xl bg-amber-500/10 p-4">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">وێبگەڕەکەت نەتوانی PDF نیشان بدات. تکایە فایلەکە دابەزێنە.</p>
                      {documentDownloadUrl && (
                        <a href={documentDownloadUrl} download className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 px-5 text-sm transition-colors">
                          <Download className="h-4 w-4" />داگرتنی هاوپێچ
                        </a>
                      )}
                    </div>
                  </object>
                )}
                {attachmentType === "image" && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 overflow-auto">
                    <img
                      src={documentFileUrl}
                      alt="هاوپێچی نووسراو"
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                    />
                  </div>
                )}
                {(attachmentType === "word" || attachmentType === "other") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={ku}>
                    <div className={`rounded-2xl ${aMeta.bg} p-5`}>
                      <AttachIcon className={`h-10 w-10 ${aMeta.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {attachmentType === "word" ? "فایلی Word" : "ئەم فایلە"} لەناو وێبگەڕدا پیشاندانی ناکرێت.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">تکایە فایلەکە دابەزێنە بۆ بینینی ناوەرۆکەکەی.</p>
                    </div>
                    {documentDownloadUrl && (
                      <a href={documentDownloadUrl} download className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 px-5 text-sm transition-colors">
                        <Download className="h-4 w-4" />داگرتنی هاوپێچ
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-card shrink-0">
            {documentDownloadUrl && (
              <a
                href={documentDownloadUrl}
                download
                className="flex items-center gap-2 rounded-xl border border-border/70 py-2 px-4 text-sm hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />داگرتن
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Replace attachment modal ── */}
      <Dialog open={replaceOpen} onOpenChange={(open) => { setReplaceOpen(open); if (!open) setNewAttachment(null); }}>
        <DialogContent className="max-w-md rounded-2xl" style={ku}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base" style={ku}>
              <div className="rounded-lg bg-muted p-1.5">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </div>
              نوێکردنەوەی هاوپێچ
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              هاوپێچی نوێ هەڵبژێرە بۆ ئەوەی جێگای هاوپێچی ئێستای نووسراوەکە بگرێتەوە. ئەم کردارە تۆمار دەکرێت لە مێژووی جووڵەی نووسراودا.
            </p>

            <label
              htmlFor="replace-attachment-input"
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-8 px-4 text-center cursor-pointer transition-all duration-200 ${
                newAttachment
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border hover:border-violet-400 hover:bg-violet-500/5"
              }`}
            >
              {newAttachment ? (
                <>
                  <div className="rounded-2xl bg-emerald-500/10 p-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">{newAttachment.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(newAttachment.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-muted p-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">کلیک بکە بۆ هەڵبژاردنی هاوپێچ</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PDF، Word (.doc/.docx)، وێنە (.jpg/.png)</p>
                  </div>
                </>
              )}
              <input
                id="replace-attachment-input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                className="hidden"
                onChange={(e) => setNewAttachment(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReplaceOpen(false)}
                disabled={replaceAttachmentMutation.isPending}
                className="rounded-xl border-border/70"
              >
                هەڵوەشاندنەوە
              </Button>
              <Button
                onClick={() => { if (newAttachment && documentId) replaceAttachmentMutation.mutate({ id: documentId, data: { attachment: newAttachment } }); }}
                disabled={!newAttachment || replaceAttachmentMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700"
              >
                {replaceAttachmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                نوێکردنەوە
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
