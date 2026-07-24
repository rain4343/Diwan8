import React from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  FileText,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { RobotVariant } from "./RobotMascot";

interface SectionHeroProps {
  variant: RobotVariant;
  title: string;
  subtitle?: string;
  accentColor?: string;
  children?: React.ReactNode;
}

const GLOW_COLORS: Record<RobotVariant, string> = {
  dashboard: "rgba(59,130,246,0.15)",
  documents: "rgba(245,158,11,0.15)",
  staff: "rgba(6,182,212,0.15)",
  departments: "rgba(16,185,129,0.15)",
  reports: "rgba(139,92,246,0.15)",
  leaves: "rgba(52,211,153,0.15)",
  chat: "rgba(14,165,233,0.15)",
  admin: "rgba(139,92,246,0.2)",
  login: "rgba(59,130,246,0.15)",
};

const ACCENT_COLORS: Record<RobotVariant, string> = {
  dashboard: "#60a5fa",
  documents: "#fbbf24",
  staff: "#22d3ee",
  departments: "#34d399",
  reports: "#a78bfa",
  leaves: "#6ee7b7",
  chat: "#7dd3fc",
  admin: "#c4b5fd",
  login: "#93c5fd",
};

const SECTION_ICONS: Record<RobotVariant, LucideIcon> = {
  dashboard: LayoutDashboard,
  documents: FileText,
  staff: Users,
  departments: Building2,
  reports: BarChart3,
  leaves: CalendarCheck2,
  chat: MessageCircle,
  admin: ShieldCheck,
  login: LayoutDashboard,
};

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

export function SectionHero({ variant, title, subtitle, children }: SectionHeroProps) {
  const glow = GLOW_COLORS[variant];
  const accent = ACCENT_COLORS[variant];
  const Icon = SECTION_ICONS[variant];

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6 slide-up"
      style={{
        background: `linear-gradient(135deg, rgba(10,18,40,0.95) 0%, rgba(15,25,55,0.95) 100%)`,
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 50%, ${glow} 0%, transparent 70%)` }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative flex items-center gap-6 p-5 pr-6" dir="rtl">
        {/* Section icon */}
        <div
          className="relative hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:flex"
          style={{
            background: `linear-gradient(145deg, ${glow}, rgba(255,255,255,0.04))`,
            border: `1px solid ${accent}55`,
            boxShadow: `0 0 24px ${glow}`,
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ boxShadow: `inset 0 0 18px ${glow}` }}
          />
          <Icon className="relative h-7 w-7" strokeWidth={1.8} style={{ color: accent }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h1
            className="text-xl font-extrabold tracking-tight"
            style={{ ...ku, color: accent }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-0.5 text-white/50" style={ku}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Optional right-side actions */}
        {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}

      </div>
    </div>
  );
}

export default SectionHero;
