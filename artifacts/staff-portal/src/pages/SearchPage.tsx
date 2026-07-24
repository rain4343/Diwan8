import React, { useState } from "react";
import { Link } from "wouter";
import { Search, FileText, FolderOpen, User, ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

interface SearchResult {
  type: string; id: number; title: string; subtitle: string;
  status?: string; date?: string; dept?: string; href: string;
}

const TYPE_ICONS: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  document: { icon: FileText, color: "text-blue-600", bg: "bg-blue-500/10", label: "نوسراو" },
  case: { icon: FolderOpen, color: "text-amber-600", bg: "bg-amber-500/10", label: "پرونده" },
  user: { icon: User, color: "text-violet-600", bg: "bg-violet-500/10", label: "بەکارهێنەر" },
};

const STEP_LABELS: Record<string, string> = {
  draft: "پێشنووس", sent: "نێردراو", received: "وەرگیراو",
  review: "پێداچوونەوە", assigned: "سپاردراو",
  completed: "تەواوبوو", rejected: "ڕەتکراوە",
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [direction, setDirection] = useState("all");
  const [submitted, setSubmitted] = useState("");

  const { data: results = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ["search", submitted, type, direction],
    queryFn: () => {
      const params = new URLSearchParams();
      if (submitted) params.set("q", submitted);
      if (type !== "all") params.set("type", type);
      if (direction !== "all") params.set("direction", direction);
      return apiFetch(`/search?${params.toString()}`);
    },
    enabled: submitted.length > 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(q);
  }

  return (
    <div className="space-y-6" style={ku} dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Search className="h-5 w-5 text-sky-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">گەڕانی پێشکەوتوو</h1>
          <p className="text-sm text-muted-foreground">گەڕان لە هەموو بابەتەکاندا</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)}
            placeholder="ژمارەی نوسراو، بابەت، ناوی نێردەر..." className="pr-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="جۆر" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">هەموو جۆر</SelectItem>
            <SelectItem value="documents">نوسراوەکان</SelectItem>
            <SelectItem value="cases">پرونده‌کان</SelectItem>
            <SelectItem value="users">بەکارهێنەران</SelectItem>
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger className="w-32"><SelectValue placeholder="ئاراستە" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">هەموو</SelectItem>
            <SelectItem value="هاتوو">هاتوو</SelectItem>
            <SelectItem value="ڕۆشتوو">ڕۆشتوو</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={!q.trim() || isFetching} className="gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          گەڕان
        </Button>
      </form>

      {submitted && (
        <p className="text-sm text-muted-foreground">
          {isFetching ? "دەگەڕێت..." : `${results.length} ئەنجام بۆ "${submitted}"`}
        </p>
      )}

      {results.length > 0 && (
        <div className="bg-card border rounded-xl divide-y overflow-hidden">
          {results.map((r, i) => {
            const meta = TYPE_ICONS[r.type] ?? TYPE_ICONS.document;
            return (
              <Link key={i} href={r.href}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 cursor-pointer group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <meta.icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{meta.label}</span>
                      {r.status && (
                        <span className="text-xs text-muted-foreground">— {STEP_LABELS[r.status] ?? r.status}</span>
                      )}
                    </div>
                    <p className="text-sm truncate mt-0.5">{r.subtitle}</p>
                    {r.dept && <p className="text-xs text-muted-foreground mt-0.5">{r.dept}</p>}
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {submitted && !isFetching && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p>هیچ ئەنجامێک نەدۆزرایەوە</p>
        </div>
      )}
    </div>
  );
}
