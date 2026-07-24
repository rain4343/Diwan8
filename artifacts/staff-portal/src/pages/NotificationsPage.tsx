import React from "react";
import { Bell, CheckCheck, FileText, UserPlus, Clock, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

interface Notification {
  id: number; type: string; title: string; message: string;
  is_read: boolean; created_at: string; data?: Record<string, unknown>;
}

const TYPE_META: Record<string, { icon: any; color: string; bg: string }> = {
  new_assignment: { icon: UserPlus, color: "text-violet-600", bg: "bg-violet-500/10" },
  document_sent: { icon: FileText, color: "text-blue-600", bg: "bg-blue-500/10" },
  deadline: { icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-500/10" },
  status_change: { icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: notifs = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/notifications/mine"),
    refetchInterval: 30_000,
  });

  const readMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMut = useMutation({
    mutationFn: () => apiFetch("/notifications/mark-all-read", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      toast({ title: "هەموو خوێندرانەوە ✓" });
    },
  });

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6" style={ku} dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center relative">
            <Bell className="h-5 w-5 text-amber-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">ئاگادارکردنەوەکان</h1>
            <p className="text-sm text-muted-foreground">{unreadCount} نوێ</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => readAllMut.mutate()} disabled={readAllMut.isPending}>
            <CheckCheck className="h-4 w-4" />هەموو خوێندنەوە
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" /></div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>هیچ ئاگادارکردنەوەیەک نییە</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl divide-y overflow-hidden">
          {notifs.map(n => {
            const meta = TYPE_META[n.type] ?? { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };
            return (
              <div key={n.id} className={`flex items-start gap-3 px-5 py-4 hover:bg-muted/20 transition-colors ${!n.is_read ? "bg-amber-500/5" : ""}`}
                onClick={() => !n.is_read && readMut.mutate(n.id)}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <meta.icon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "yyyy/MM/dd HH:mm")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
