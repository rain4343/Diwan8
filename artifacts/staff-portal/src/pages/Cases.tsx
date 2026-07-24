import React, { useState } from "react";
import { Link } from "wouter";
import { FolderOpen, Plus, Search, Eye, Trash2, ChevronRight, FileText, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: "کراوە", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  closed: { label: "داخراوە", cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  archived: { label: "ئەرشیفکراوە", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
};

interface Case {
  id: number; case_number: string; title: string; description?: string;
  status: string; department_name?: string; creator_name?: string;
  doc_count: number; created_at: string;
}

function NewCaseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ case_number: "", title: "", description: "" });
  const qc = useQueryClient();
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: (data: typeof form) => apiFetch("/cases", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      toast({ title: "پرونده دروستکرا ✓" });
      onClose();
      setForm({ case_number: "", title: "", description: "" });
    },
    onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" style={ku}>
        <DialogHeader><DialogTitle>پرونده نوێ</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-sm text-muted-foreground">ژمارەی پرونده *</label>
            <Input value={form.case_number} onChange={e => setForm(f => ({ ...f, case_number: e.target.value }))}
              placeholder="مەسەلە: CASE-2026-001" className="mt-1" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">ناونیشان *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="ناونیشانی پرونده" className="mt-1" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">وەسف</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="وەسفی پرونده (ئارەزووی)" className="mt-1" />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>پاشگەزبوونەوە</Button>
          <Button onClick={() => mut.mutate(form)} disabled={mut.isPending || !form.case_number || !form.title}>
            {mut.isPending ? "دەنێرێت..." : "دروستکردن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Cases() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ["cases"],
    queryFn: () => apiFetch("/cases"),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/cases/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases"] }); toast({ title: "پرونده سڕایەوە" }); },
    onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
  });

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.case_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6" style={ku} dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">بەڕێوەبردنی پرونده</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} پرونده</p>
          </div>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />پرونده نوێ
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="گەڕان..." className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">هەموو</SelectItem>
            <SelectItem value="open">کراوە</SelectItem>
            <SelectItem value="closed">داخراوە</SelectItem>
            <SelectItem value="archived">ئەرشیف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>هیچ پرونده نەدۆزرایەوە</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <div key={c.id} className="group bg-card border rounded-xl p-4 hover:border-amber-500/30 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FolderOpen className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.case_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_LABELS[c.status]?.cls ?? ""}`}>
                        {STATUS_LABELS[c.status]?.label ?? c.status}
                      </span>
                    </div>
                    <p className="font-semibold mt-1 truncate">{c.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {c.department_name && <span>{c.department_name}</span>}
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{c.doc_count} نوسراو</span>
                      <span>{format(new Date(c.created_at), "yyyy/MM/dd")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/cases/${c.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {user?.is_system_admin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => delMut.mutate(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewCaseDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
