import React, { useEffect, useRef, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Save, Shield, User, Mail, Hash, Building2, Settings, Check, Lock } from "lucide-react";
import {
  useGetUser, getGetUserQueryKey,
  useCreateUser,
  useUpdateUser,
  useListDepartments, getListDepartmentsQueryKey,
  useListRoles, getListRolesQueryKey,
  useGetUserRoles, getGetUserRolesQueryKey,
  useAssignRole, useRemoveRole
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

// ── Permission grid constants (same as Roles.tsx) ─────────────────────────
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
  admin:       "بەڕێوەبردن",
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
  admin:       "bg-rose-500/10 text-rose-700 border-rose-200",
};

// ── Form schema ───────────────────────────────────────────────────────────
const userSchema = z.object({
  full_name: z.string().min(1, "ناوی تەواو پێویستە").max(150),
  username: z.string().min(1, "ناوی بەکارهێنەر پێویستە").max(50),
  email: z.string().email("ئیمەیڵ هەڵەیە"),
  password: z.string().min(6, "ووشەی نهێنی دەبێت کەمتر نەبێت لە ٦ پیت").or(z.literal("")),
  password_confirmation: z.string().optional(),
  department_id: z.coerce.number().nullable().optional(),
  role_ids: z.array(z.number()).default([])
}).refine((data) => data.password === data.password_confirmation, {
  message: "وشەی نهێنی و دووبارەکردنەوەکەی وەک یەک نین",
  path: ["password_confirmation"]
});

type UserFormValues = z.infer<typeof userSchema>;

// ── Permission Dialog ──────────────────────────────────────────────────────
interface PermDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;          // null = new user (local state only)
  localSelected: Set<number>;
  onLocalChange: (next: Set<number>) => void;
}

function PermDialog({ open, onClose, userId, localSelected, onLocalChange }: PermDialogProps) {
  const { toast } = useToast();
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load all permissions + current user's direct permissions when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const permReqs: Promise<Permission[]>[] = [apiFetch<Permission[]>("/permissions")];
    if (userId) {
      permReqs.push(apiFetch<Permission[]>(`/permissions/users/${userId}`));
    }
    Promise.all(permReqs)
      .then(([all, assigned]) => {
        setAllPerms(all);
        if (userId && assigned) {
          setSelected(new Set(assigned.map(p => p.id)));
        } else {
          // New user — restore previously chosen local selection
          setSelected(new Set(localSelected));
        }
      })
      .catch(() => toast({ title: "هەڵە", description: "دەسەڵاتەکان نەهاتنە بار", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, userId]);

  function togglePerm(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (userId) {
      // Existing user — save directly via API
      setSaving(true);
      try {
        await apiFetch(`/permissions/users/${userId}/assign`, {
          method: "POST",
          body: JSON.stringify({ permission_ids: [...selected] }),
        });
        toast({ title: `${selected.size} دەسەڵات پاشەکەوتکران ✓` });
        onClose();
      } catch (e: any) {
        toast({ title: "هەڵە", description: e.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      // New user — propagate to parent local state
      onLocalChange(selected);
      toast({ title: `${selected.size} دەسەڵات هەڵبژێردرا — پاشەکەوت دەبن لەکاتی دروستکردنی یوزەردا` });
      onClose();
    }
  }

  const grouped = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={ku}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-violet-500" />
            دەسەڵاتی تایبەتی یوزەر
          </DialogTitle>
          <DialogDescription>
            دەسەڵاتە تایبەتەکانی ئەم یوزەرە دیاری بکە. ئەمانە زیادە بە دەسەڵاتەکانی ڕۆڵەکەیدا.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">چاوەڕێ بکە...</div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Select all / clear buttons */}
            <div className="flex items-center justify-between pb-1 border-b">
              <span className="text-xs text-muted-foreground">
                {selected.size} لە {allPerms.length} دەسەڵات هەڵبژێردراوە
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" style={ku}
                  onClick={() => setSelected(new Set(allPerms.map(p => p.id)))}>
                  هەموو
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" style={ku}
                  onClick={() => setSelected(new Set())}>
                  پاکردنەوە
                </Button>
              </div>
            </div>

            {Object.entries(grouped).map(([module, perms]) => (
              <div key={module} className={`rounded-xl border p-4 ${MODULE_COLORS[module] ?? "bg-muted/30 border-border"}`}>
                <div className="font-semibold text-sm mb-3 flex items-center justify-between">
                  <span>{MODULE_LABELS[module] ?? module}</span>
                  <button
                    type="button"
                    className="text-[10px] opacity-60 hover:opacity-100"
                    onClick={() => {
                      const ids = perms.map(p => p.id);
                      const allOn = ids.every(id => selected.has(id));
                      setSelected(prev => {
                        const next = new Set(prev);
                        if (allOn) ids.forEach(id => next.delete(id));
                        else ids.forEach(id => next.add(id));
                        return next;
                      });
                    }}
                  >
                    {perms.every(p => selected.has(p.id)) ? "پاکردنەوەی هەموو" : "هەموو"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {perms.map(perm => {
                    const isOn = selected.has(perm.id);
                    return (
                      <button
                        key={perm.id}
                        type="button"
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
          <Button variant="outline" onClick={onClose} style={ku}>پاشگەزبوونەوە</Button>
          <Button onClick={handleSave} disabled={saving || loading} style={ku}>
            {saving ? "چاوەڕێ بکە..." : "پاشەکەوتکردن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function StaffForm() {
  const [, params] = useRoute("/staff/:id");
  const isNew = !params?.id || params.id === "new";
  const userId = !isNew ? Number(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useGetUser(userId as number, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId as number) }
  });

  const { data: userRoles } = useGetUserRoles(userId as number, {
    query: { enabled: !!userId, queryKey: getGetUserRolesQueryKey(userId as number) }
  });

  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });
  const { data: roles } = useListRoles({ query: { queryKey: getListRolesQueryKey() } });

  // ── Permission dialog state ───────────────────────────────────────
  const [permOpen, setPermOpen] = useState(false);
  // For new users: local permission selection (saved after user created)
  const [localPerms, setLocalPerms] = useState<Set<number>>(new Set());
  // For existing users: count of direct perms (for badge display)
  const [existingPermCount, setExistingPermCount] = useState<number | null>(null);

  // Load direct permission count for existing user (badge display only)
  useEffect(() => {
    if (!userId) return;
    apiFetch<Permission[]>(`/permissions/users/${userId}`)
      .then(perms => setExistingPermCount(perms.length))
      .catch(() => {});
  }, [userId, permOpen]); // re-check after dialog closes

  // ── Mutations ─────────────────────────────────────────────────────
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "فەرمانبەرەکە بە سەرکەوتوویی نوێکرایەوە." });
        setLocation("/staff");
      },
      onError: (err: any) => {
        toast({ title: "هەڵە لە نوێکردنەوە", description: err.message, variant: "destructive" });
      }
    }
  });

  const assignRoleMutation = useAssignRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserRolesQueryKey(userId as number) });
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId as number) });
      }
    }
  });

  const removeRoleMutation = useRemoveRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserRolesQueryKey(userId as number) });
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId as number) });
      }
    }
  });

  // ── Form ──────────────────────────────────────────────────────────
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { full_name: "", username: "", email: "", password: "", password_confirmation: "", department_id: null, role_ids: [] }
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (user && !initializedRef.current) {
      form.reset({
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        password: "",
        password_confirmation: "",
        department_id: user.department_id,
        role_ids: userRoles?.map(r => r.id) || []
      });
      initializedRef.current = true;
    }
  }, [user, userRoles, form]);

  useEffect(() => { return () => { initializedRef.current = false; }; }, [userId]);

  // ── Submit ────────────────────────────────────────────────────────
  const onSubmit = async (values: UserFormValues) => {
    if (isNew) {
      if (!values.password) {
        form.setError("password", { message: "ووشەی نهێنی بۆ فەرمانبەری نوێ پێویستە" });
        return;
      }
      const createData = { ...values };
      delete (createData as any).password_confirmation;
      try {
        const newUser = await createMutation.mutateAsync({ data: createData as any });
        // Assign direct permissions if any were selected
        if (localPerms.size > 0 && (newUser as any)?.id) {
          await apiFetch(`/permissions/users/${(newUser as any).id}/assign`, {
            method: "POST",
            body: JSON.stringify({ permission_ids: [...localPerms] }),
          });
        }
        toast({ title: "فەرمانبەرەکە بە سەرکەوتوویی زیادکرا." });
        setLocation("/staff");
      } catch (err: any) {
        toast({ title: "هەڵە لە دروستکردن", description: err.message, variant: "destructive" });
      }
    } else {
      const updateData = { ...values };
      if (!updateData.password) delete (updateData as any).password;
      delete (updateData as any).password_confirmation;
      delete (updateData as any).role_ids;
      updateMutation.mutate({ id: userId as number, data: updateData });
    }
  };

  const handleRoleToggle = (roleId: number, checked: boolean) => {
    if (isNew) {
      const currentRoles = form.getValues().role_ids;
      form.setValue("role_ids", checked ? [...currentRoles, roleId] : currentRoles.filter(id => id !== roleId));
      return;
    }
    if (checked) {
      assignRoleMutation.mutate({ id: userId as number, data: { role_id: roleId } });
    } else {
      removeRoleMutation.mutate({ id: userId as number, roleId });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && loadingUser) {
    return <div className="p-8 text-center text-muted-foreground" style={ku}>چاوەڕێ بکە...</div>;
  }

  const currentFormRoles = form.watch("role_ids");

  // Badge text for the permissions card
  const permBadgeCount = isNew ? localPerms.size : (existingPermCount ?? 0);

  return (
    <div className="max-w-3xl space-y-6" data-testid="page-staff-form" style={ku}>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/staff"><ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? "زیادکردنی فەرمانبەری نوێ" : "دەستکاریکردنی فەرمانبەر"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isNew ? "تۆمارێکی نوێ دروست بکە و دەسەڵات دابنێ." : "زانیاری فەرمانبەر بگۆڕە."}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Personal Info ───────────────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                زانیاری کەسی
              </CardTitle>
              <CardDescription>ناو و زانیاری پەیوەندی فەرمانبەر.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>ناوی تەواو</FormLabel>
                  <FormControl>
                    <Input placeholder="بۆ نموونە: ئەحمەد محەمەد" className="text-right" style={ku} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>ناوی بەکارهێنەر</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="ahmad.m" className="pr-9 text-right" style={ku} {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>ئیمەیڵ</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="ahmad@example.com" className="pr-9 text-right" style={ku} {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isNew ? "ووشەی نهێنی" : "گۆڕینی ووشەی نهێنی"}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isNew ? "ووشەی نهێنی دروست بکە" : "بۆ نەگۆڕین بەتاڵ بهێڵەرەوە"}
                      style={ku}
                      {...field}
                    />
                  </FormControl>
                  {isNew && <FormDescription>پێویستە بۆ دروستکردنی هەژمار.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password_confirmation" render={({ field }) => (
                <FormItem>
                  <FormLabel>دووبارەکردنەوەی ووشەی نهێنی</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isNew ? "ووشەی نهێنی دووبارە بنووسە" : "دووبارە بنووسەرەوە ئەگەر ووشەی نهێنیت گۆڕی"}
                      style={ku}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Department ──────────────────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                هۆبە و جێگیرکردن
              </CardTitle>
              <CardDescription>هۆبەی ئەم فەرمانبەرە دیاری بکە.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="department_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>هۆبە</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))}
                    value={field.value ? field.value.toString() : "none"}
                  >
                    <FormControl>
                      <SelectTrigger style={ku}>
                        <SelectValue placeholder="هۆبەیەک هەڵبژێرە" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent style={ku}>
                      <SelectItem value="none">بێ هۆبە</SelectItem>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Roles ───────────────────────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                ڕۆڵەکان
              </CardTitle>
              <CardDescription>
                {isNew
                  ? "ڕۆڵەکان دیاری بکە لەکاتی دروستکردندا."
                  : "گۆڕانکاری لە ڕۆڵەکان دەستبەجێ کاردەکات."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {roles?.map((role) => {
                  const isAssigned = isNew
                    ? currentFormRoles.includes(role.id)
                    : (userRoles?.some(r => r.id === role.id) ?? false);
                  const isRoleChanging = assignRoleMutation.isPending || removeRoleMutation.isPending;
                  return (
                    <div key={role.id} className="flex flex-row-reverse items-start gap-3 rounded-md border p-4 shadow-sm">
                      <Checkbox
                        checked={isAssigned}
                        disabled={!isNew && isRoleChanging}
                        onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                      />
                      <div className="space-y-1 leading-none flex-1 text-right">
                        <label className="font-medium text-sm leading-none cursor-pointer" style={ku}>
                          {role.name}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Direct Permissions ──────────────────────────────── */}
          <Card className="shadow-sm border-violet-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-violet-500" />
                  <div>
                    <CardTitle className="text-lg">دەسەڵاتی تایبەتی</CardTitle>
                    <CardDescription className="mt-0.5">
                      دەسەڵاتی زیادە بە ڕۆڵەکاندا — تایبەت بە ئەم یوزەرە.
                    </CardDescription>
                  </div>
                </div>
                {permBadgeCount > 0 && (
                  <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
                    {permBadgeCount} دەسەڵات
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPermOpen(true)}
                  className="flex items-center gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
                  style={ku}
                >
                  <Settings className="h-4 w-4" />
                  {permBadgeCount > 0 ? "دەستکاریکردنی دەسەڵاتەکان" : "دیاریکردنی دەسەڵاتەکان"}
                </Button>
                {permBadgeCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {permBadgeCount} دەسەڵاتی تایبەت هەڵبژێردراوە
                  </span>
                )}
                {permBadgeCount === 0 && (
                  <span className="text-sm text-muted-foreground">
                    هیچ دەسەڵاتی تایبەتێک نییە — تەنها دەسەڵاتی ڕۆڵەکان کار دەکات
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Actions ─────────────────────────────────────────── */}
          <div className="flex justify-start gap-4 pb-12">
            <Button type="submit" disabled={isPending} className="min-w-[120px]" style={ku}>
              {isPending ? "چاوەڕێ بکە..." : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  پاشەکەوتکردن
                </>
              )}
            </Button>
            <Button type="button" variant="outline" asChild style={ku}>
              <Link href="/staff">پاشگەزبوونەوە</Link>
            </Button>
          </div>
        </form>
      </Form>

      {/* ── Permission Dialog ──────────────────────────────────── */}
      <PermDialog
        open={permOpen}
        onClose={() => setPermOpen(false)}
        userId={userId}
        localSelected={localPerms}
        onLocalChange={setLocalPerms}
      />
    </div>
  );
}
