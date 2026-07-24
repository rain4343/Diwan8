import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Building2, ShieldCheck, Menu, LogOut,
  FileText, UserCircle, MessageCircle, BarChart3, AlarmClock, Moon, Sun,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/usePermission";
import { NotificationBell } from "@/components/NotificationBell";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

function ThemeToggle() {
  const [isLight, setIsLight] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("ediwan-theme") === "light"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isLight ? "light" : "dark";
    localStorage.setItem("ediwan-theme", isLight ? "light" : "dark");
  }, [isLight]);

  return (
    <button
      type="button"
      data-testid="button-theme-toggle"
      aria-label={isLight ? "چوونە دۆخی تاریک" : "چوونە دۆخی ڕۆشن"}
      title={isLight ? "دۆخی تاریک" : "دۆخی ڕۆشن"}
      onClick={() => setIsLight((value) => !value)}
      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
    >
      {isLight ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  accentColor: string;
  glowColor: string;
  module?: string;
}

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard, label: "داشبۆرد",    href: "/",
    accentColor: "#60a5fa", glowColor: "rgba(59,130,246,0.5)",
  },
  {
    icon: FileText,        label: "نوسراوەکان", href: "/documents",
    accentColor: "#fbbf24", glowColor: "rgba(245,158,11,0.5)", module: "documents",
  },
  {
    icon: Users,           label: "فەرمانبەران",href: "/staff",
    accentColor: "#22d3ee", glowColor: "rgba(6,182,212,0.5)", module: "users",
  },
  {
    icon: Building2,       label: "هۆبەکان",    href: "/departments",
    accentColor: "#34d399", glowColor: "rgba(16,185,129,0.5)", module: "departments",
  },
  {
    icon: BarChart3,       label: "ڕاپۆرتەکان", href: "/reports",
    accentColor: "#a78bfa", glowColor: "rgba(139,92,246,0.5)", module: "reports",
  },
  {
    icon: AlarmClock,      label: "مۆڵەتەکان",  href: "/leaves",
    accentColor: "#6ee7b7", glowColor: "rgba(52,211,153,0.5)", module: "cases",
  },
  {
    icon: MessageCircle,   label: "چات",         href: "/chat",
    accentColor: "#7dd3fc", glowColor: "rgba(14,165,233,0.5)",
  },
  {
    icon: UserCircle,      label: "پڕۆفایلی من", href: "/profile",
    accentColor: "#94a3b8", glowColor: "rgba(148,163,184,0.5)",
  },
];

const adminNavItems: NavItem[] = [
  {
    icon: ShieldCheck, label: "بەڕێوەبەری سیستەم", href: "/admin",
    accentColor: "#c4b5fd", glowColor: "rgba(139,92,246,0.6)",
  },
];

function StarField() {
  const stars = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 2 + 2,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animation: `star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  function initials(name: string) {
    return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  }

  const visibleNavItems = navItems.filter(
    (item) => !item.module || hasModuleAccess(user, item.module)
  );
  const allNavItems = user?.is_system_admin
    ? [...visibleNavItems, ...adminNavItems]
    : visibleNavItems;

  const currentItem =
    allNavItems.find((item) =>
      item.href === "/"
        ? location === "/"
        : location.startsWith(item.href)
    ) ?? allNavItems[0];

  const SidebarContent = () => (
    <div
      className="flex h-full flex-col relative overflow-hidden"
      dir="rtl"
      style={{
        background: "linear-gradient(180deg, #02060f 0%, #030b1a 50%, #020810 100%)",
        borderLeft: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <StarField />

      {/* ── BRAND ── */}
      <div className="relative px-4 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 p-0.5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 0 20px rgba(59,130,246,0.2)",
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="لۆگۆ"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2
              className="text-sm font-extrabold leading-tight"
              style={{ ...ku, color: "#34d399" }}
            >
              ب.پ.شارباژێڕ
            </h2>
            <p
              className="text-xs font-bold mt-0.5 tracking-wider"
              style={{ ...ku, color: "#60a5fa" }}
            >
              E-Diwan
            </p>
          </div>
        </div>

        {/* Divider with glow */}
        <div className="mt-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)" }} />
      </div>

       {/* ── CURRENT SECTION ICON ── */}
      <div className="relative px-4 py-2 flex-shrink-0 flex justify-center">
         <div
           className="relative flex h-12 w-12 items-center justify-center rounded-2xl"
           style={{
             background: `linear-gradient(145deg, ${currentItem.glowColor}, rgba(255,255,255,0.04))`,
             border: `1px solid ${currentItem.accentColor}55`,
             boxShadow: `0 0 22px ${currentItem.glowColor}`,
           }}
         >
          <div
             className="absolute inset-0 rounded-2xl pointer-events-none"
             style={{ boxShadow: `inset 0 0 18px ${currentItem.glowColor}` }}
          />
           <currentItem.icon
             className="relative h-6 w-6"
             strokeWidth={1.8}
             style={{ color: currentItem.accentColor }}
           />
        </div>
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: currentItem.accentColor,
            fontFamily: "'Noto Kufi Arabic', sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {currentItem.label}
        </div>
      </div>

      {/* ── NAV ── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto relative">
        {allNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? ({
                      ...ku,
                      "--glow-color": item.glowColor,
                    } as React.CSSProperties)
                  : ku
              }
            >
              {/* Active glow line on right */}
              {isActive && (
                <span
                  className="absolute right-0 top-[18%] bottom-[18%] w-[3px] rounded-l-full"
                  style={{
                    background: item.accentColor,
                    boxShadow: `0 0 10px ${item.accentColor}, 0 0 20px ${item.glowColor}`,
                    animation: "nav-active-glow 2s ease-in-out infinite",
                  }}
                />
              )}

              <item.icon
                className="h-[17px] w-[17px] shrink-0 transition-all duration-200"
                style={{ color: isActive ? item.accentColor : undefined }}
              />

              <span className="flex-1">{item.label}</span>

              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: item.accentColor,
                    boxShadow: `0 0 6px ${item.accentColor}`,
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── USER FOOTER ── */}
      <div
        className="relative px-3 pb-4 pt-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {user && (
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 mb-1.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                boxShadow: "0 0 12px rgba(59,130,246,0.4)",
              }}
            >
              {initials(user.full_name || user.username)}
            </div>
            <div className="flex-1 min-w-0" dir="rtl">
              <p className="text-xs font-semibold text-white truncate" style={ku}>
                {user.full_name || user.username}
              </p>
              <p className="text-[10px] truncate" style={{ ...ku, color: "#60a5fa" }}>
                {user.is_system_admin ? "بەڕێوەبەری سەرەکی" : (user.roles[0] ?? "فەرمانبەر")}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="nav-item w-full text-sm"
          style={ku}
        >
          <LogOut className="h-4 w-4 shrink-0 text-red-400/70" />
          <span>چوونەدەرەوە</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden flex-row-reverse" style={{ background: "#020810" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-3 left-3 z-50 rounded-xl border"
            style={{
              background: "rgba(5,15,35,0.9)",
              borderColor: "rgba(255,255,255,0.1)",
              color: "white",
            }}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-60 p-0 border-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ background: "#030d1e" }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
          style={{
            background: "rgba(3,13,30,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: currentItem.accentColor,
                boxShadow: `0 0 8px ${currentItem.accentColor}`,
              }}
            />
            <span className="text-sm font-semibold text-white/70" style={ku}>
              {currentItem.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell />
            {user && (
              <div
                className="h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(148,163,184,0.8)",
                  fontFamily: "'Noto Kufi Arabic', sans-serif",
                }}
              >
                <div
                  className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white" }}
                >
                  {initials(user.full_name || user.username)}
                </div>
                {user.full_name || user.username}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto" dir="rtl">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Shell;
