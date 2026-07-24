import React, { useState } from "react";
import { Shield, Download, Search, User, Clock, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  DELETE: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  WORKFLOW: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  LOGIN: "bg-violet-500/10 text-violet-700 border-violet-500/20",
};

function actionColor(action: string) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
}

export default function AuditLog() {
  const { user } = useAuth();
  const [entityFilter, setEntityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: any[]; page: number; limit: number }>({
    queryKey: ["audit-logs", entityFilter, page],
    queryFn: () => apiFetch(`/audit-logs?entity_type=${entityFilter === "all" ? "" : entityFilter}&page=${page}&limit=50`),
    enabled: !!user?.is_system_admin,
  });

  if (!user?.is_system_admin) {
    return <div className="text-center py-20 text-muted-foreground" style={ku}>تەنها بەڕێوەبەری سیستەم دەتوانێت ئەم بەشە ببینێت</div>;
  }

  const rows = (data?.data ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.username ?? "").toLowerCase().includes(q) || r.action.toLowerCase().includes(q) || (r.entity_label ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" style={ku} dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">تۆمارەکانی کردار</h1>
            <p className="text-sm text-muted-foreground">Audit Log — کێ، کەی، چی کرد</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.open("/api/audit-logs/export", "_blank")}>
          <Download className="h-4 w-4" />داگرتنی CSV
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="گەڕان لە بەکارهێنەر، کردار..." className="pr-9" />
        </div>
        <Select value={entityFilter} onValueChange={v => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="جۆری بابەت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">هەموو</SelectItem>
            <SelectItem value="document">نوسراو</SelectItem>
            <SelectItem value="user">بەکارهێنەر</SelectItem>
            <SelectItem value="case">پرونده</SelectItem>
            <SelectItem value="deadline">دڵنیابوون</SelectItem>
            <SelectItem value="permission">مۆڵەت</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">هیچ کردارێک نەدۆزرایەوە</p>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r: any) => (
              <div key={r.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 text-sm">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.full_name ?? r.username ?? "سیستەم"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${actionColor(r.action)}`}>{r.action}</span>
                    <span className="text-muted-foreground text-xs">{r.entity_type}: {r.entity_label ?? r.entity_id ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(r.created_at), "yyyy/MM/dd HH:mm:ss")}</span>
                    {r.ip_address && <span className="font-mono">{r.ip_address}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>پێشتر</Button>
        <span className="text-muted-foreground">پەڕە {page}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(data?.data.length ?? 0) < 50}>دواتر</Button>
      </div>
    </div>
  );
}
