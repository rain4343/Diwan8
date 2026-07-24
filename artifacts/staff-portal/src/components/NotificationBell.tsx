import React, { useEffect } from "react";
import { Bell } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery<{ count: number }>({
    queryKey: ["notifications-count"],
    queryFn: () => apiFetch("/notifications/mine/unread-count"),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socket.on("notification", () => {
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    });
    return () => { socket.off("notification"); };
  }, [user, qc]);

  const count = data?.count ?? 0;

  return (
    <Link href="/notifications">
      <button
        type="button"
        data-testid="button-notifications"
        aria-label="ئاگادارکردنەوەکان"
        title="ئاگادارکردنەوەکان"
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
    </Link>
  );
}
