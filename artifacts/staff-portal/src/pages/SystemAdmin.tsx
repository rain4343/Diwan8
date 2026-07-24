import React from "react";
import { Link } from "wouter";
import { ShieldCheck, UserPlus, Users, Building2 } from "lucide-react";
import Roles from "@/pages/Roles";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

export default function SystemAdmin() {
  return (
    <div className="space-y-6" data-testid="page-system-admin" style={ku}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/10 p-2.5">
          <ShieldCheck className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">بەڕێوەبەری سیستم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ئەم بەشە تەنها بۆ بەڕێوەبەری سەرەکی سیستمە — دەسەڵاتی تەواوی بەڕێوەبردنی فەرمانبەران، هۆبەکان و ڕۆڵەکانی تیایە.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/staff/new">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center mb-4">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">دروستکردنی فەرمانبەری نوێ</h3>
            <p className="text-xs text-muted-foreground">دروستکردنی هەژماری بەکارهێنەر، دانانی وشەی نهێنی و دیاریکردنی ڕۆڵ.</p>
          </div>
        </Link>
        <Link href="/staff">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">بەڕێوەبردنی فەرمانبەران</h3>
            <p className="text-xs text-muted-foreground">دەستکاریکردن، گۆڕینی وشەی نهێنی و سڕینەوەی هەر فەرمانبەرێک.</p>
          </div>
        </Link>
        <Link href="/departments">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center mb-4">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">بەڕێوەبردنی هۆبەکان</h3>
            <p className="text-xs text-muted-foreground">دروستکردن، دەستکاریکردن و سڕینەوەی هۆبەکانی ڕێکخراوەکە.</p>
          </div>
        </Link>
      </div>

      {/* Roles management, embedded */}
      <Roles />
    </div>
  );
}
