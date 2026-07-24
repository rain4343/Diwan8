import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShieldCheck, UserPlus, Users, Building2, UserCog, Shield,
  LayoutGrid
} from "lucide-react";
import Roles from "@/pages/Roles";
import UserPermissionsPanel from "@/pages/UserPermissionsPanel";
import { cn } from "@/lib/utils";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

type Tab = "overview" | "roles" | "user-perms";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",   label: "نمای گشتی",           icon: <LayoutGrid className="h-4 w-4" /> },
  { id: "roles",      label: "ڕۆڵ و دەسەڵاتەکان",   icon: <Shield className="h-4 w-4" /> },
  { id: "user-perms", label: "دەسەڵاتەکانی بەکارهێنەر", icon: <UserCog className="h-4 w-4" /> },
];

export default function SystemAdmin() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="space-y-6" data-testid="page-system-admin" style={ku}>
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/10 p-2.5">
          <ShieldCheck className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">بەڕێوەبەری سیستم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            بەڕێوەبردنی فەرمانبەران، هۆبەکان، ڕۆڵەکان و ئاستەکانی دەسەڵات.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            style={ku}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "roles" && <Roles />}
      {activeTab === "user-perms" && <UserPermissionsPanel />}
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6" style={ku}>
      {/* Quick action cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/staff/new">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full group">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">دروستکردنی فەرمانبەری نوێ</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">دروستکردنی هەژماری بەکارهێنەر، دانانی وشەی نهێنی و دیاریکردنی ڕۆڵ و هۆبە.</p>
          </div>
        </Link>

        <Link href="/staff">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer h-full group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">بەڕێوەبردنی فەرمانبەران</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">دەستکاریکردن، گۆڕینی وشەی نهێنی و سڕینەوەی هەر فەرمانبەرێک.</p>
          </div>
        </Link>

        <Link href="/departments">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer h-full group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">بەڕێوەبردنی هۆبەکان</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">دروستکردن، دەستکاریکردن و سڕینەوەی هۆبەکانی ڕێکخراوەکە.</p>
          </div>
        </Link>
      </div>

      {/* RBAC information cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="font-semibold text-sm">جیاکاری نوسراوەکان بەپێی هۆبە</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
              هەر بەکارهێنەرێک تەنها نوسراوەکانی هۆبەی خۆی دەبینێت و بەڕێوەی دەبات.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
              نوسراوی نوێ دروست دەکرێت بە نازناوی هۆبەی دروستکەر.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
              نوسراوی هۆبەی دیکە نازانرێت بدۆزرێتەوە، بدەستکاری یان بسڕدرێتەوە.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-violet-500 mt-0.5 shrink-0">★</span>
              بەڕێوەبەری سیستم هەموو نوسراوەکانی هەموو هۆبەکان دەبینێت.
            </li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserCog className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm">دەستکاریکردنی فەرمانبەر بەپێی هۆبە</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
              هەموو بەکارهێنەرەکان ناوی فەرمانبەران و پێکهاتەی هۆبەکان دەبینن.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
              تەنها فەرمانبەری هۆبەی خۆی دەتوانرێت دەستکاری بکرێت.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-red-500 mt-0.5 shrink-0">✗</span>
              دەستکاریکردنی فەرمانبەری هۆبەی دیکە بلۆک دەکرێت.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-violet-500 mt-0.5 shrink-0">★</span>
              بەڕێوەبەری سیستم هەموو فەرمانبەرەکانی هەموو هۆبەکان دەتوانێت دەستکاری بکات.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
