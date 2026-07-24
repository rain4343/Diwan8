import React, { useState, useEffect, useMemo } from "react";
import {
  Users, Shield, Check, Search, ChevronDown, ChevronRight,
  UserCog, Building2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

interface Permission {
  id: number;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

interface StaffUser {
  id: number;
  full_name: string;
  username: string;
  email: string;
  department_id: number | null;
  department_name: string | null;
  roles: { id: number; name: string }[];
}

const MODULE_LABELS: Record<string, string> = {
  documents:   "نوسراوەکان",
  users:       "فەرمانبەران",
  departments: "هۆبەکان",
  cases:       "مۆڵەتەکان",
  reports:     "ڕاپۆرتەکان",
  audit:       "تۆماری گۆڕانکاری",
  admin:       "بەڕێوەبەری سیستم",
};

const ACTION_LABELS: Record<string, string> = {
  read:   "بینین",
  create: "دروستکردن",
  update: "دەستکاریکردن",
  delete: "سڕینەوە",
  export: "هەناردەکردن",
};

const MODULE_COLORS: Record<string, string> = {
  documents:   "bg-amber-500/10 text-amber-700 border-amber-200",
  users:       "bg-blue-500/10 text-blue-700 border-blue-200",
  departments: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  cases:       "bg-green-500/10 text-green-700 border-green-200",
  reports:     "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  audit:       "bg-slate-500/10 text-slate-700 border-slate-200",
  admin:       "bg-violet-500/10 text-violet-700 border-violet-200",
};

export default function UserPermissionsPanel() {
  const { toast } = useToast();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [directPerms, setDirectPerms] = useState<Set<number>>(new Set());
  const [rolePerms, setRolePerms] = useState<Set<number>>(new Set());
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  // Load all users
  useEffect(() => {
    apiFetch<StaffUser[]>("/users")
      .then(setUsers)
      .catch(() => toast({ title: "هەڵە", description: "فەرمانبەران نەهاتنە بار", variant: "destructive" }))
      .finally(() => setUsersLoading(false));
  }, []);

  // Load all permissions (once)
  useEffect(() => {
    apiFetch<Permission[]>("/permissions")
      .then(setAllPerms)
      .catch(() => {});
  }, []);

  // Load permissions when user selected
  useEffect(() => {
    if (!selectedUser) return;
    setPermLoading(true);
    Promise.all([
      apiFetch<Permission[]>(`/permissions/users/${selectedUser.id}`),
      // Role permissions via each role
      selectedUser.roles.length > 0
        ? Promise.all(
            selectedUser.roles.map((r) =>
              apiFetch<Permission[]>(`/permissions/roles/${r.id}`)
            )
          ).then((arrays) => arrays.flat())
        : Promise.resolve([]),
    ])
      .then(([direct, fromRoles]) => {
        setDirectPerms(new Set(direct.map((p) => p.id)));
        setRolePerms(new Set(fromRoles.map((p) => p.id)));
      })
      .catch(() =>
        toast({ title: "هەڵە", description: "دەسەڵاتەکان نەهاتنە بار", variant: "destructive" })
      )
      .finally(() => setPermLoading(false));
  }, [selectedUser]);

  function toggleDirect(id: number) {
    setDirectPerms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedUser) return;
    setPermSaving(true);
    try {
      await apiFetch(`/permissions/users/${selectedUser.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ permission_ids: [...directPerms] }),
      });
      toast({ title: "دەسەڵاتەکانی بەکارهێنەر پاشەکەوتکران ✓" });
      setSelectedUser(null);
    } catch (e: any) {
      toast({ title: "هەڵە", description: e.message, variant: "destructive" });
    } finally {
      setPermSaving(false);
    }
  }

  const grouped = useMemo(
    () =>
      allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
      }, {}),
    [allPerms]
  );

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !search ||
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          (u.department_name ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  return (
    <div className="space-y-5" style={ku}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-5 w-5 text-violet-500" />
            دەسەڵاتەکانی بەکارهێنەر
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            دیاری بکە هەر بەکارهێنەرێک چی دەبینێت و چی دەتوانێت بکات. دەسەڵاتەکانی ڕاستەوخۆ لە سەرەوەی ڕۆڵەکان دەستدەکەن.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="گەڕان بە ناو یان هۆبە..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 text-right"
            style={ku}
          />
        </div>
      </div>

      {/* Users table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            لیستی فەرمانبەران
          </CardTitle>
          <CardDescription>
            کلیک بکە لەسەر <strong>دەستکاریکردنی دەسەڵات</strong> بۆ ئەوەی دەسەڵاتەکانی ڕاستەوخۆی ئەو فەرمانبەرە بگۆڕی.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs border-b border-t">
                <tr>
                  <th className="px-5 py-3 font-medium text-right">ناوی تەواو</th>
                  <th className="px-5 py-3 font-medium text-right hidden sm:table-cell">هۆبە</th>
                  <th className="px-5 py-3 font-medium text-right hidden md:table-cell">ڕۆڵەکان</th>
                  <th className="px-5 py-3 font-medium text-right">کردار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usersLoading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      چاوەڕێ بکە...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                      هیچ فەرمانبەرێک نەدۆزرایەوە
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-medium text-foreground">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                        {user.department_name ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {user.department_name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {user.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          ) : (
                            user.roles.slice(0, 2).map((r) => (
                              <Badge key={r.id} variant="secondary" className="text-xs">
                                {r.name}
                              </Badge>
                            ))
                          )}
                          {user.roles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.roles.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className="flex items-center gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 text-xs"
                          style={ku}
                        >
                          <Shield className="h-3 w-3" />
                          دەستکاریکردنی دەسەڵات
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Permission editor dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto" style={ku}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <UserCog className="h-5 w-5 text-violet-500" />
              دەسەڵاتەکانی: {selectedUser?.full_name}
            </DialogTitle>
            <DialogDescription className="text-right">
              دەسەڵاتەکانی <strong>ڕاستەوخۆ</strong> دیاری بکە. کارتەی ئاسمانی وایە لەڕێگەی ڕۆڵ
              پێدراوە و ناتوانرێت لێرەوە بسڕدرێتەوە — ئەگەر پێویستت بوو ڕۆڵەکەی بگۆڕە.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2 -mt-1 pb-2 border-b">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {selectedUser.department_name ?? "بێ هۆبە"}
              </span>
              {selectedUser.roles.map((r) => (
                <Badge key={r.id} variant="secondary" className="text-xs">
                  {r.name}
                </Badge>
              ))}
            </div>
          )}

          {permLoading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              چاوەڕێ بکە...
            </div>
          ) : (
            <div className="space-y-4 py-1">
              {Object.entries(grouped).map(([module, perms]) => (
                <div key={module} className={`rounded-xl border p-4 ${MODULE_COLORS[module] ?? "bg-muted/30 border-border"}`}>
                  <div className="font-semibold text-sm mb-3">
                    {MODULE_LABELS[module] ?? module}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {perms.map((perm) => {
                      const isDirect = directPerms.has(perm.id);
                      const fromRole = rolePerms.has(perm.id);
                      return (
                        <button
                          key={perm.id}
                          onClick={() => !fromRole && toggleDirect(perm.id)}
                          disabled={fromRole}
                          title={fromRole ? "لەڕێگەی ڕۆڵ پێدراوە" : undefined}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all text-right
                            ${fromRole
                              ? "bg-sky-50 border-sky-300 opacity-80 cursor-not-allowed"
                              : isDirect
                                ? "bg-white border-current shadow-sm cursor-pointer"
                                : "bg-white/40 border-transparent opacity-60 hover:opacity-90 cursor-pointer"
                            }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors
                            ${fromRole
                              ? "bg-sky-400 border-sky-400"
                              : isDirect
                                ? "bg-current border-current"
                                : "border-current/40"
                            }`}>
                            {(isDirect || fromRole) && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className="leading-tight">
                            {perm.description ?? ACTION_LABELS[perm.action] ?? perm.action}
                            {fromRole && (
                              <span className="block text-sky-600 text-[10px] font-normal">لەڕێگەی ڕۆڵ</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex-row-reverse gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setSelectedUser(null)} style={ku}>
              پاشگەزبوونەوە
            </Button>
            <Button
              onClick={savePermissions}
              disabled={permSaving || permLoading}
              style={ku}
            >
              {permSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin ml-1" />چاوەڕێ بکە...</>
              ) : "پاشەکەوتکردن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
