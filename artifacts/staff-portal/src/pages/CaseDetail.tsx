import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { FolderOpen, FileText, Plus, Trash2, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const STEP_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "پێشنووس", cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  sent: { label: "نێردراو", cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  received: { label: "وەرگیراو", cls: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  review: { label: "پێداچوونەوە", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  assigned: { label: "سپاردراو", cls: "bg-violet-500/10 text-violet-700 border-violet-500/20" },
  completed: { label: "تەواوبوو", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  rejected: { label: "ڕەتکراوە", cls: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
};

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:id");
  const caseId = Number(params?.id);
  const [addDocId, setAddDocId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: c, isLoading } = useQuery<any>({
    queryKey: ["case", caseId],
    queryFn: () => apiFetch(`/cases/${caseId}`),
    enabled: !!caseId,
  });

  const addMut = useMutation({
    mutationFn: (document_id: number) => apiFetch(`/cases/${caseId}/documents`, { method: "POST", body: JSON.stringify({ document_id }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["case", caseId] }); toast({ title: "نوسراوەکە زیادکرا ✓" }); setAddOpen(false); setAddDocId(""); },
    onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (docId: number) => apiFetch(`/cases/${caseId}/documents/${docId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["case", caseId] }); toast({ title: "نوسراوەکە سڕایەوە" }); },
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => apiFetch(`/cases/${caseId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["case", caseId] }); toast({ title: "دۆخ نوێکرایەوە ✓" }); },
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" /></div>;
  if (!c) return <div className="text-center py-20 text-muted-foreground">پرونده نەدۆزرایەوە</div>;

  return (
    <div className="space-y-6" style={ku} dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/cases" className="hover:text-foreground">پرونده‌کان</Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-foreground">{c.case_number}</span>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.case_number}</span>
              </div>
              <h1 className="text-xl font-bold">{c.title}</h1>
              {c.description && <p className="text-muted-foreground mt-1 text-sm">{c.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {c.department_name && <span>{c.department_name}</span>}
                <span>{c.creator_name}</span>
                <span>{format(new Date(c.created_at), "yyyy/MM/dd")}</span>
              </div>
            </div>
          </div>
          <Select value={c.status} onValueChange={s => statusMut.mutate(s)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">کراوە</SelectItem>
              <SelectItem value="closed">داخراوە</SelectItem>
              <SelectItem value="archived">ئەرشیف</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">نوسراوەکان ({c.documents?.length ?? 0})</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />زیادکردن
          </Button>
        </div>
        {!c.documents?.length ? (
          <div className="text-center py-12 text-muted-foreground text-sm">هیچ نوسراوێک زیادنەکراوە</div>
        ) : (
          <div className="divide-y">
            {c.documents.map((d: any) => {
              const step = STEP_LABELS[d.workflow_step] ?? { label: d.workflow_step, cls: "" };
              return (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 group">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{d.document_number}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${step.cls}`}>{step.label}</span>
                    </div>
                    <p className="text-sm truncate">{d.subject}</p>
                  </div>
                  <Link href={`/documents/${d.id}`}>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7">بینین</Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => removeMut.mutate(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" style={ku}>
          <DialogHeader><DialogTitle>زیادکردنی نوسراو</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-sm text-muted-foreground">ناسنامەی نوسراو (ID)</label>
            <Input value={addDocId} onChange={e => setAddDocId(e.target.value)} placeholder="ژمارە..." className="mt-1" type="number" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>پاشگەز</Button>
            <Button onClick={() => addMut.mutate(Number(addDocId))} disabled={!addDocId || addMut.isPending}>زیادکردن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
