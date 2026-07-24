import React, { useState, useEffect } from "react";
import { Shield, Plus, Trash2, Settings, Check } from "lucide-react";
import { useListRoles, getListRolesQueryKey, useCreateRole, useDeleteRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

const MODULE_LABELS: Record<string, string> = {
  documents:   "نوسراوەکان",
  users:       "فەرمانبەران",
  departments: "هۆبەکان",
  cases:       "مۆڵەتەکان",
  reports:     "ڕاپۆرتەکان",
  audit:       "تۆماری گۆڕانکاری",
};

const ACTION_LABELS: Record<string, string> = {
  read:   "بینین",
  create: "دروستکردن",
  update: "دەستکاریکردن",
  delete: "سڕینەوە",
  export: "هەناردەکردن",
};

const MODULE_COLORS: Record<string, string> = {
  documents:   "bg-amber-500/10 text-amber-600 border-amber-200",
  users:       "bg-blue-500/10 text-blue-600 border-blue-200",
  departments: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  cases:       "bg-green-500/10 text-green-600 border-green-200",
  reports:     "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  audit:       "bg-slate-500/10 text-slate-600 border-slate-200",
};

export default function Roles() {
  const { data: roles, isLoading, refetch } = useListRoles({ query: { queryKey: getListRolesQueryKey() } });
  const { toast } = useToast();

  // ── Create role ────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleName, setRoleName] = useState("");

  const createMutation = useCreateRole({
    mutation: {
      onSuccess: () => {
        toast({ title: "ڕۆڵەکە بە سەرکەوتوویی دروستکرا." });
        refetch();
        setDialogOpen(false);
        setRoleName("");
      },
      onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
    },
  });

  // ── Delete role ────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMutation = useDeleteRole({
    mutation: {
      onSuccess: () => {
        toast({ title: "ڕۆڵەکە سڕایەوە." });
        refetch();
        setDeleteId(null);
      },
      onError: (e: any) => {
        toast({ title: "هەڵە", description: e.message, variant: "destructive" });
        setDeleteId(null);
      },
    },
  });

  // ── Permission management ──────────────────────────────────────
  const [permRole, setPermRole] = useState<{ id: number; name: string } | null>(null);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  useEffect(() => {
    if (!permRole) return;
    setPermLoading(true);
    Promise.all([
      apiFetch<Permission[]>("/permissions"),
      apiFetch<Permission[]>(`/permissions/roles/${permRole.id}`),
    ])
      .then(([all, assigned]) => {
        setAllPerms(all);
        setSelected(new Set(assigned.map((p) => p.id)));
      })
      .catch(() => toast({ title: "هەڵە", description: "دەسەڵاتەکان نەهاتنە بار", variant: "destructive" }))
      .finally(() => setPermLoading(false));
  }, [permRole]);

  function togglePerm(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function savePermissions() {
    if (!permRole) return;
    setPermSaving(true);
    try {
      await apiFetch(`/permissions/roles/${permRole.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ permission_ids: [...selected] }),
      });
      toast({ title: "دەسەڵاتەکان پاشەکەوتکران ✓" });
      setPermRole(null);
    } catch (e: any) {
      toast({ title: "هەڵە", description: e.message, variant: "destructive" });
    } finally {
      setPermSaving(false);
    }
  }

  // Group permissions by module
  const grouped = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const saveRole = () => {
    if (!roleName.trim()) return;
    createMutation.mutate({ data: { name: roleName } });
  };

  return (
    <div className="space-y-6" data-testid="page-roles" style={ku}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">بەڕێوەبردنی ڕۆڵەکان</h1>
          <p className="text-muted-foreground mt-1">بەڕێوەبردنی ئاستەکانی دەسەڵات و مافی دەستگەیشتن.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          دروستکردنی ڕۆڵی نوێ
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            لیستی ڕۆڵەکان
          </CardTitle>
          <CardDescription>
            هەر ڕۆڵێک دەسەڵاتی خۆی هەیە. دوگمەی <strong>دەسەڵاتەکان</strong> بکە تا دیاری بکەیت ئەو ڕۆڵە چی دەبینێت و چی دەتوانێت بکات.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs border-b border-t">
                <tr>
                  <th className="px-6 py-4 font-medium text-right">#</th>
                  <th className="px-6 py-4 font-medium text-right">ناوی ڕۆڵ</th>
                  <th className="px-6 py-4 font-medium text-right">دەسەڵاتەکان</th>
                  <th className="px-6 py-4 font-medium text-right">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">چاوەڕێ بکە...</td></tr>
                ) : !roles?.length ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">هیچ ڕۆڵێک نەدۆزرایەوە!</td></tr>
                ) : (
                  roles.map((role, index) => (
                    <tr key={role.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 text-muted-foreground text-right">{index + 1}</td>
                      <td className="px-6 py-4 font-medium text-foreground text-right">{role.name}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPermRole({ id: role.id, name: role.name })}
                          className="flex items-center gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
                          style={ku}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          دەسەڵاتەکان
                        </Button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(role.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={ku}
                        >
                          <Trash2 className="h-4 w-4 ml-1" />
                          سڕینەوە
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

      {/* ── Permission management dialog ──────────────────────── */}
      <Dialog open={!!permRole} onOpenChange={(open) => !open && setPermRole(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={ku}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-500" />
              دەسەڵاتەکانی ڕۆڵ: {permRole?.name}
            </DialogTitle>
            <DialogDescription>
              دیاری بکە ئەم ڕۆڵە چی دەبینێت و چی دەتوانێت بکات. تیکمارکراوەکان چالاکن.
            </DialogDescription>
          </DialogHeader>

          {permLoading ? (
            <div className="py-10 text-center text-muted-foreground">چاوەڕێ بکە...</div>
          ) : (
            <div className="space-y-5 py-2">
              {Object.entries(grouped).map(([module, perms]) => (
                <div key={module} className={`rounded-xl border p-4 ${MODULE_COLORS[module] ?? "bg-muted/30 border-border"}`}>
                  <div className="font-semibold text-sm mb-3">
                    {MODULE_LABELS[module] ?? module}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {perms.map((perm) => {
                      const isOn = selected.has(perm.id);
                      return (
                        <button
                          key={perm.id}
                          onClick={() => togglePerm(perm.id)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all text-right ${
                            isOn
                              ? "bg-white border-current shadow-sm"
                              : "bg-white/40 border-transparent opacity-60 hover:opacity-90"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                            isOn ? "bg-current border-current" : "border-current/40"
                          }`}>
                            {isOn && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          {perm.description ?? ACTION_LABELS[perm.action] ?? perm.action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex-row-reverse gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setPermRole(null)} style={ku}>
              پاشگەزبوونەوە
            </Button>
            <Button onClick={savePermissions} disabled={permSaving || permLoading} style={ku}>
              {permSaving ? "چاوەڕێ بکە..." : "پاشەکەوتکردن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create role dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={ku}>
          <DialogHeader>
            <DialogTitle>دروستکردنی ڕۆڵی نوێ</DialogTitle>
            <DialogDescription>ڕۆڵێکی نوێ دروست بکە بۆ دابەشکردن بەسەر فەرمانبەراندا.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-1.5 block">ناوی ڕۆڵ</label>
            <Input
              placeholder="بۆ نموونە: بەڕێوەبەری گشتی"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveRole()}
              className="text-right"
              style={ku}
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} style={ku}>پاشگەزبوونەوە</Button>
            <Button onClick={saveRole} disabled={createMutation.isPending || !roleName.trim()} style={ku}>
              پاشەکەوتکردن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete role confirm ────────────────────────────────── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent style={ku}>
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی ڕۆڵ؟</AlertDialogTitle>
            <AlertDialogDescription>
              دڵنیایت؟ ئەم ڕۆڵە بە تەواوی دەسڕێتەوە و لە هەموو فەرمانبەرەکانیش جیادەکرێتەوە.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel style={ku}>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
