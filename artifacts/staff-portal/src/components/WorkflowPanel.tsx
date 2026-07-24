import React, { useState } from "react";
import {
  CheckCircle2, Clock, Send, MailOpen, ClipboardList,
  UserCheck, XCircle, ChevronRight, Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useListDepartments, getListDepartmentsQueryKey } from "@workspace/api-client-react";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const STEPS = [
  { key: "draft", label: "پێشنووس", icon: ClipboardList, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/30" },
  { key: "sent", label: "نێردراو", icon: Send, color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { key: "received", label: "وەرگیراو", icon: MailOpen, color: "text-sky-600", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  { key: "review", label: "پێداچوونەوە", icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { key: "assigned", label: "سپاردراو", icon: UserCheck, color: "text-violet-600", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  { key: "completed", label: "تەواوبوو", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
] as const;

const REJECTED = { key: "rejected", label: "ڕەتکراوە", icon: XCircle, color: "text-rose-600", bg: "bg-rose-500/10", border: "border-rose-500/30" };

const NEXT_STEPS: Record<string, string[]> = {
  draft: ["sent", "rejected"],
  sent: ["received", "rejected"],
  received: ["review", "rejected"],
  review: ["assigned", "completed", "rejected"],
  assigned: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

interface TimelineEntry {
  id: number;
  step: string;
  step_label: string;
  from_dept_name?: string;
  to_dept_name?: string;
  assigned_to_user_id?: number;
  notes?: string;
  creator_name?: string;
  created_at: string;
}

function AdvanceDialog({
  open, onClose, docId, currentStep, onSuccess,
}: { open: boolean; onClose: () => void; docId: number; currentStep: string; onSuccess: () => void }) {
  const [step, setStep] = useState("");
  const [notes, setNotes] = useState("");
  const [toDeptId, setToDeptId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const { toast } = useToast();

  const nextOptions = (NEXT_STEPS[currentStep] ?? []).map(s => {
    const info = [...STEPS, REJECTED].find(x => x.key === s);
    return info ? { key: s, label: info.label } : null;
  }).filter(Boolean) as { key: string; label: string }[];

  const { data: departments = [] } = useListDepartments({
    query: { queryKey: getListDepartmentsQueryKey() },
  });

  const mut = useMutation({
    mutationFn: () => apiFetch(`/workflow/${docId}/advance`, {
      method: "POST",
      body: JSON.stringify({
        step,
        notes: notes || undefined,
        to_dept_id: toDeptId ? Number(toDeptId) : undefined,
        assigned_to_user_id: assignedUserId ? Number(assignedUserId) : undefined,
      }),
    }),
    onSuccess: () => {
      toast({ title: `مەرحەلەی نوسراوەکە گۆڕدرا بۆ «${nextOptions.find(o => o.key === step)?.label ?? step}» ✓` });
      onSuccess();
      onClose();
      setStep(""); setNotes(""); setToDeptId(""); setAssignedUserId("");
    },
    onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" style={ku}>
        <DialogHeader><DialogTitle>پێشبردنی Workflow</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm text-muted-foreground">مەرحەلەی دواتر *</label>
            <Select value={step} onValueChange={setStep}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="مەرحەلە هەڵبژێرە..." /></SelectTrigger>
              <SelectContent>
                {nextOptions.map(o => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(step === "sent" || step === "received") && (
            <div>
              <label className="text-sm text-muted-foreground">هۆبەی مەبەست</label>
              <Select value={toDeptId} onValueChange={setToDeptId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="هۆبە هەڵبژێرە..." /></SelectTrigger>
                <SelectContent>
                  {(departments as any[]).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm text-muted-foreground">تێبینی</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="تێبینیەک زیادبکە (ئارەزووی)..." className="mt-1" rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>پاشگەز</Button>
          <Button onClick={() => mut.mutate()} disabled={!step || mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "پێشبردن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkflowPanel({ docId, currentStep, onStepChanged }: {
  docId: number; currentStep: string; onStepChanged: () => void;
}) {
  const [advanceOpen, setAdvanceOpen] = useState(false);

  const { data: timeline = [], isLoading, refetch } = useQuery<TimelineEntry[]>({
    queryKey: ["workflow-timeline", docId],
    queryFn: () => apiFetch(`/workflow/${docId}/timeline`),
    enabled: !!docId,
  });

  const currentStepInfo = [...STEPS, REJECTED].find(s => s.key === currentStep) ?? STEPS[0];
  const canAdvance = (NEXT_STEPS[currentStep] ?? []).length > 0;

  const allSteps = [...STEPS, ...(currentStep === "rejected" || timeline.some(t => t.step === "rejected") ? [REJECTED] : [])];
  const currentIdx = allSteps.findIndex(s => s.key === currentStep);

  return (
    <div className="space-y-5" style={ku} dir="rtl">
      {/* Progress bar */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">مەرحەلەی ئێستا</h3>
          {canAdvance && (
            <Button size="sm" onClick={() => setAdvanceOpen(true)} className="gap-1.5 h-8">
              <ChevronRight className="h-3.5 w-3.5" />
              پێشبردن
            </Button>
          )}
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {STEPS.map((s, i) => {
            const stepIdx = STEPS.findIndex(x => x.key === s.key);
            const isDone = stepIdx < currentIdx || (currentStep === "completed" && s.key === "completed");
            const isCurrent = s.key === currentStep;
            const isRejected = currentStep === "rejected";

            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isCurrent ? `${s.bg} ${s.color} ${s.border} shadow-sm` :
                  isDone && !isRejected ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                  "bg-muted/30 text-muted-foreground border-border"
                }`}>
                  <s.icon className="h-3 w-3" />
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </React.Fragment>
            );
          })}
          {currentStep === "rejected" && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${REJECTED.bg} ${REJECTED.color} ${REJECTED.border}`}>
                <REJECTED.icon className="h-3 w-3" />{REJECTED.label}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h3 className="font-semibold text-sm">تایمڵاین — مێژووی کردارەکان</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : timeline.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">هیچ مەرحەلەیەک تۆمارنەکراوە</div>
        ) : (
          <div className="divide-y">
            {timeline.map((entry, i) => {
              const stepInfo = [...STEPS, REJECTED].find(s => s.key === entry.step) ?? STEPS[0];
              return (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${stepInfo.bg}`}>
                    <stepInfo.icon className={`h-4 w-4 ${stepInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stepInfo.bg} ${stepInfo.color} ${stepInfo.border}`}>
                        {entry.step_label}
                      </span>
                      {entry.from_dept_name && (
                        <span className="text-xs text-muted-foreground">لە: {entry.from_dept_name}</span>
                      )}
                      {entry.to_dept_name && (
                        <span className="text-xs text-muted-foreground">→ {entry.to_dept_name}</span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-sm mt-1.5 bg-muted/30 rounded-lg px-3 py-2">{entry.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span>{entry.creator_name}</span>
                      <span>·</span>
                      <span>{format(new Date(entry.created_at), "yyyy/MM/dd HH:mm")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdvanceDialog
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        docId={docId}
        currentStep={currentStep}
        onSuccess={() => { refetch(); onStepChanged(); }}
      />
    </div>
  );
}
