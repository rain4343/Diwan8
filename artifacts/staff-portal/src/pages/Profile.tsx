import React, { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useGetUser, getGetUserQueryKey, useUpdateUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Camera, Save, KeyRound, ImageIcon, UserCircle, Phone,
  Upload, Mail, User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const profileSchema = z.object({
  full_name: z.string().min(1, "ناوی تەواو پێویستە").max(150),
  email: z.string().email("ئیمەیڵ هەڵەیە"),
  phone: z.string().max(30).optional(),
});

const passwordSchema = z.object({
  password: z.string().min(6, "ووشەی نهێنی دەبێت کەمتر نەبێت لە ٦ پیت"),
  password_confirmation: z.string().min(1, "دووبارەکردنەوەی ووشەی نهێنی پێویستە"),
}).refine((d) => d.password === d.password_confirmation, {
  message: "ووشەکانی نهێنی وەک یەک نین",
  path: ["password_confirmation"],
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

function getUploadUrl(folder: string, filename: string | null | undefined): string | null {
  if (!filename) return null;
  return `${window.location.origin}/api/users/uploads/${folder}/${filename}`;
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sigFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [sigUploading, setSigUploading] = useState(false);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: user, isLoading } = useGetUser(authUser!.id, {
    query: { queryKey: getGetUserQueryKey(authUser!.id) },
  });

  // ── Profile form ──────────────────────────────────────────────
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", email: "", phone: "" },
  });

  // Populate form once user data is loaded (stable reset, not reactive values)
  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.full_name, user?.email, user?.phone]);

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "پڕۆفایل نوێکرایەوە." });
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(authUser!.id) });
      },
      onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
    },
  });

  const onProfileSubmit = (values: ProfileValues) => {
    updateMutation.mutate({
      id: authUser!.id,
      data: { full_name: values.full_name, email: values.email, phone: values.phone || null },
    });
  };

  // ── Password form ─────────────────────────────────────────────
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });

  const passwordMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "ووشەی نهێنی گۆڕدرا." });
        passwordForm.reset();
      },
      onError: (e: any) => toast({ title: "هەڵە", description: e.message, variant: "destructive" }),
    },
  });

  const onPasswordSubmit = (values: PasswordValues) => {
    passwordMutation.mutate({ id: authUser!.id, data: { password: values.password } });
  };

  // ── Avatar upload ─────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast({ title: "هەڵە", description: "تەنها فایلی PNG یان JPG قبوڵدەکرێت.", variant: "destructive" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "هەڵە", description: "فایل دەبێت کەمتر بێت لە ٣ MB.", variant: "destructive" });
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${window.location.origin}/api/users/${authUser!.id}/avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast({ title: "وێنەی پڕۆفایل نوێکرایەوە." });
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(authUser!.id) });
    } catch (err: any) {
      toast({ title: "هەڵە", description: err.message, variant: "destructive" });
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  // ── Signature upload ──────────────────────────────────────────
  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      toast({ title: "هەڵە", description: "تەنها فایلی PNG قبوڵدەکرێت.", variant: "destructive" });
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: "هەڵە", description: "فایل دەبێت کەمتر بێت لە ١ MB.", variant: "destructive" });
      return;
    }
    setSigPreview(URL.createObjectURL(file));
    setSigUploading(true);
    try {
      const formData = new FormData();
      formData.append("signature", file);
      const res = await fetch(`${window.location.origin}/api/users/${authUser!.id}/signature`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast({ title: "ئیمزا بارکرا." });
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(authUser!.id) });
    } catch (err: any) {
      toast({ title: "هەڵە", description: err.message, variant: "destructive" });
      setSigPreview(null);
    } finally {
      setSigUploading(false);
      if (sigFileRef.current) sigFileRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentAvatar = avatarPreview ?? getUploadUrl("avatars", user?.avatar_image);
  const currentSig = sigPreview ?? getUploadUrl("signatures", user?.signature_image);

  return (
    <div className="space-y-6 max-w-2xl" style={ku}>

      {/* ── Header with avatar ── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-l from-violet-500 via-violet-400 to-violet-600" />
        <div className="flex items-center gap-5 px-6 py-5">
          {/* Avatar circle */}
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-border bg-muted flex items-center justify-center">
              {currentAvatar ? (
                <img src={currentAvatar} alt="وێنەی پڕۆفایل" className="h-full w-full object-cover" />
              ) : (
                <UserCircle className="h-12 w-12 text-muted-foreground/40" />
              )}
            </div>
            {/* Camera overlay button */}
            <button
              type="button"
              onClick={() => avatarFileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md transition-colors ring-2 ring-background"
              title="گۆڕینی وێنەی پڕۆفایل"
            >
              {avatarUploading
                ? <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">پڕۆفایل</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{user?.username}</p>
          </div>
        </div>
      </div>

      {/* ── Profile info card ── */}
      <Card className="rounded-2xl shadow-sm border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2" style={ku}>
            <User className="h-3.5 w-3.5" />
            زانیاری کەسی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
                      <User className="h-3 w-3" /> ناوی تەواو
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="text-right rounded-xl h-10 bg-background border-border/70" style={ku} />
                    </FormControl>
                    <FormMessage style={ku} />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
                      <Mail className="h-3 w-3" /> ئیمەیڵ
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" dir="ltr" className="text-left rounded-xl h-10 bg-background border-border/70" />
                    </FormControl>
                    <FormMessage style={ku} />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
                      <Phone className="h-3 w-3" /> ژمارەی مۆبایل
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        dir="ltr"
                        className="text-left rounded-xl h-10 bg-background border-border/70"
                        placeholder="07xx xxx xxxx"
                      />
                    </FormControl>
                    <FormMessage style={ku} />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl h-9 bg-violet-600 hover:bg-violet-700 gap-2"
                  style={ku}
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? "چاوەڕێ بکە..." : "پاشەکەوتکردن"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Password card ── */}
      <Card className="rounded-2xl shadow-sm border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2" style={ku}>
            <KeyRound className="h-3.5 w-3.5" />
            گۆڕینی ووشەی نهێنی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
                      ووشەی نهێنی نوێ
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="password" dir="ltr" className="text-left rounded-xl h-10 bg-background border-border/70" />
                    </FormControl>
                    <FormMessage style={ku} />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="password_confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
                      دووبارەکردنەوەی ووشەی نهێنی
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="password" dir="ltr" className="text-left rounded-xl h-10 bg-background border-border/70" />
                    </FormControl>
                    <FormMessage style={ku} />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="rounded-xl h-9 gap-2"
                  variant="outline"
                  style={ku}
                >
                  <KeyRound className="h-4 w-4" />
                  {passwordMutation.isPending ? "چاوەڕێ بکە..." : "گۆڕینی ووشەی نهێنی"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Signature card ── */}
      <Card className="rounded-2xl shadow-sm border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2" style={ku}>
            <ImageIcon className="h-3.5 w-3.5" />
            ئیمزای وێنە
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center p-6 min-h-[110px]">
            {currentSig ? (
              <img
                src={currentSig}
                alt="ئیمزا"
                className="max-h-20 object-contain"
                style={{ background: "transparent" }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                <ImageIcon className="h-8 w-8" />
                <p className="text-xs" style={ku}>هیچ ئیمزایەک بارنەکراوە.</p>
              </div>
            )}
          </div>

          <input ref={sigFileRef} type="file" accept="image/png" className="hidden" onChange={handleSignatureChange} />
          <Button
            variant="outline"
            onClick={() => sigFileRef.current?.click()}
            disabled={sigUploading}
            className="rounded-xl h-9 gap-2 border-border/70"
            style={ku}
          >
            <Upload className="h-4 w-4" />
            {sigUploading ? "بارکردن..." : "هەڵبژاردنی فایلی PNG"}
          </Button>
          <p className="text-xs text-muted-foreground" style={ku}>تەنها PNG — زۆرترین قەبارە: ١ MB</p>
        </CardContent>
      </Card>
    </div>
  );
}
