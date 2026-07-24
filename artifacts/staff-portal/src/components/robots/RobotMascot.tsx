import React, { useEffect, useId, useRef } from "react";

export type RobotVariant =
  | "dashboard"
  | "documents"
  | "staff"
  | "departments"
  | "reports"
  | "leaves"
  | "chat"
  | "admin"
  | "login";

export type RobotSize = "xs" | "sm" | "md" | "lg" | "xl";

interface RobotMascotProps {
  variant?: RobotVariant;
  size?: RobotSize;
  className?: string;
  animate?: boolean;
}

const SIZES: Record<RobotSize, number> = {
  xs: 52,
  sm: 80,
  md: 120,
  lg: 170,
  xl: 220,
};

const PALETTES: Record<
  RobotVariant,
  {
    head: string;
    body: string;
    accent: string;
    eye: string;
    glow: string;
    shadow: string;
    dark: string;
    tip: string;
  }
> = {
  dashboard: {
    head: "#1d3d8f",
    body: "#162e72",
    accent: "#60a5fa",
    eye: "#93c5fd",
    glow: "rgba(59,130,246,0.55)",
    shadow: "rgba(59,130,246,0.25)",
    dark: "#0c1d52",
    tip: "#bfdbfe",
  },
  documents: {
    head: "#92400e",
    body: "#78350f",
    accent: "#fbbf24",
    eye: "#fde68a",
    glow: "rgba(245,158,11,0.55)",
    shadow: "rgba(245,158,11,0.25)",
    dark: "#451a03",
    tip: "#fef3c7",
  },
  staff: {
    head: "#0e7490",
    body: "#0a5670",
    accent: "#22d3ee",
    eye: "#a5f3fc",
    glow: "rgba(6,182,212,0.55)",
    shadow: "rgba(6,182,212,0.25)",
    dark: "#052e3e",
    tip: "#cffafe",
  },
  departments: {
    head: "#065f46",
    body: "#064e3b",
    accent: "#34d399",
    eye: "#6ee7b7",
    glow: "rgba(16,185,129,0.55)",
    shadow: "rgba(16,185,129,0.25)",
    dark: "#022c22",
    tip: "#a7f3d0",
  },
  reports: {
    head: "#3730a3",
    body: "#2e27a0",
    accent: "#a78bfa",
    eye: "#c4b5fd",
    glow: "rgba(139,92,246,0.55)",
    shadow: "rgba(139,92,246,0.25)",
    dark: "#1e1b6e",
    tip: "#ede9fe",
  },
  leaves: {
    head: "#065f46",
    body: "#064e3b",
    accent: "#6ee7b7",
    eye: "#a7f3d0",
    glow: "rgba(52,211,153,0.55)",
    shadow: "rgba(52,211,153,0.25)",
    dark: "#022c22",
    tip: "#d1fae5",
  },
  chat: {
    head: "#0c4a6e",
    body: "#083955",
    accent: "#7dd3fc",
    eye: "#bae6fd",
    glow: "rgba(14,165,233,0.55)",
    shadow: "rgba(14,165,233,0.25)",
    dark: "#042638",
    tip: "#e0f2fe",
  },
  admin: {
    head: "#4c1d95",
    body: "#3b1479",
    accent: "#c4b5fd",
    eye: "#ddd6fe",
    glow: "rgba(139,92,246,0.6)",
    shadow: "rgba(139,92,246,0.3)",
    dark: "#2d1167",
    tip: "#ede9fe",
  },
  login: {
    head: "#176b74",
    body: "#114d61",
    accent: "#f0bf55",
    eye: "#a9f0d8",
    glow: "rgba(91,214,190,0.62)",
    shadow: "rgba(234,181,82,0.32)",
    dark: "#102c43",
    tip: "#fff0b0",
  },
};

/* Accessory SVG per variant — rendered inside the robot */
function Accessory({ variant, p }: { variant: RobotVariant; p: (typeof PALETTES)[RobotVariant] }) {
  switch (variant) {
    case "dashboard":
      // Mini bar chart on chest
      return (
        <>
          <rect x="35" y="91" width="4" height="10" rx="1" fill={p.accent} opacity="0.9" />
          <rect x="41" y="86" width="4" height="15" rx="1" fill={p.accent} opacity="0.7" />
          <rect x="47" y="89" width="4" height="12" rx="1" fill={p.accent} opacity="0.5" />
          <rect x="53" y="83" width="4" height="18" rx="1" fill={p.accent} opacity="0.9" />
          <rect x="59" y="88" width="4" height="13" rx="1" fill={p.accent} opacity="0.6" />
        </>
      );
    case "documents":
      // Book pages on chest
      return (
        <>
          <rect x="34" y="85" width="22" height="26" rx="3" fill={p.dark} stroke={p.accent} strokeWidth="1.5" />
          <rect x="34" y="85" width="4" height="26" rx="2" fill={p.accent} opacity="0.8" />
          <line x1="41" y1="92" x2="53" y2="92" stroke={p.accent} strokeWidth="1" opacity="0.6" />
          <line x1="41" y1="97" x2="53" y2="97" stroke={p.accent} strokeWidth="1" opacity="0.4" />
          <line x1="41" y1="102" x2="50" y2="102" stroke={p.accent} strokeWidth="1" opacity="0.4" />
        </>
      );
    case "staff":
      // Tie
      return (
        <>
          <polygon points="50,80 45,95 50,110 55,95" fill={p.accent} opacity="0.85" />
          <polygon points="47,80 53,80 55,90 45,90" fill={p.eye} opacity="0.9" />
        </>
      );
    case "departments":
      // Hard hat on head (above)
      return (
        <>
          <rect x="26" y="18" width="48" height="10" rx="5" fill={p.accent} opacity="0.95" />
          <rect x="20" y="25" width="60" height="5" rx="2.5" fill={p.accent} opacity="0.6" />
          {/* Wrench on chest */}
          <rect x="43" y="88" width="14" height="20" rx="3" fill={p.dark} stroke={p.accent} strokeWidth="1.5" />
          <circle cx="50" cy="100" r="4" fill={p.accent} opacity="0.7" />
        </>
      );
    case "reports":
      // Pie chart on chest
      return (
        <>
          <circle cx="50" cy="98" r="12" fill={p.dark} />
          <path d="M50,98 L50,86 A12,12 0 0,1 60.4,104 Z" fill={p.accent} opacity="0.9" />
          <path d="M50,98 L60.4,104 A12,12 0 0,1 39.6,104 Z" fill={p.eye} opacity="0.6" />
          <path d="M50,98 L39.6,104 A12,12 0 0,1 50,86 Z" fill={p.accent} opacity="0.4" />
        </>
      );
    case "leaves":
      // Calendar on chest
      return (
        <>
          <rect x="34" y="84" width="32" height="28" rx="4" fill={p.dark} stroke={p.accent} strokeWidth="1.5" />
          <rect x="34" y="84" width="32" height="9" rx="4" fill={p.accent} opacity="0.8" />
          <rect x="44" y="80" width="4" height="6" rx="2" fill={p.eye} />
          <rect x="52" y="80" width="4" height="6" rx="2" fill={p.eye} />
          <line x1="39" y1="100" x2="61" y2="100" stroke={p.accent} strokeWidth="1" opacity="0.4" />
          <circle cx="43" cy="106" r="2" fill={p.accent} opacity="0.7" />
          <circle cx="50" cy="106" r="2" fill={p.accent} opacity="0.7" />
          <circle cx="57" cy="106" r="2" fill={p.accent} opacity="0.3" />
        </>
      );
    case "chat":
      // Speech bubble emanating
      return (
        <>
          <rect x="65" y="40" width="30" height="20" rx="8" fill={p.accent} opacity="0.85" />
          <path d="M72,60 L68,68 L76,60" fill={p.accent} opacity="0.85" />
          <circle cx="71" cy="50" r="2" fill={p.dark} />
          <circle cx="79" cy="50" r="2" fill={p.dark} />
          <circle cx="87" cy="50" r="2" fill={p.dark} />
        </>
      );
    case "admin":
      // Shield on chest
      return (
        <>
          <path
            d="M50,82 L63,87 L63,100 Q63,112 50,118 Q37,112 37,100 L37,87 Z"
            fill={p.dark}
            stroke={p.accent}
            strokeWidth="1.5"
          />
          <path
            d="M50,88 L59,92 L59,102 Q59,110 50,114 Q41,110 41,102 L41,92 Z"
            fill={p.accent}
            opacity="0.25"
          />
          <path d="M46,100 L49,103 L55,96" stroke={p.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "login":
      // E-Diwan core: a compact holographic education signal
      return (
        <>
          <circle cx="50" cy="103" r="14" fill={p.dark} stroke={p.accent} strokeWidth="1.5" opacity="0.95" />
          <circle cx="50" cy="103" r="8" fill={p.accent} opacity="0.18" />
          <circle cx="50" cy="103" r="4" fill={p.eye} className="antenna-tip" />
          <path d="M40 118 H60" stroke={p.accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <path d="M44 121 H56" stroke={p.eye} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
        </>
      );
    default:
      return null;
  }
}

export function RobotMascot({ variant = "dashboard", size = "md", className = "", animate = true }: RobotMascotProps) {
  const px = SIZES[size];
  const p = PALETTES[variant];
  const uid = useId().replace(/:/g, "");

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${animate ? "robot-float" : ""} ${className}`}
      style={{ width: px, height: px * 1.4 }}
    >
      {/* Glow aura */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-30 pointer-events-none"
        style={{ background: p.glow, top: "20%", transform: "scale(0.8)" }}
      />

      <svg
        viewBox="0 0 100 150"
        width={px}
        height={px * 1.4}
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
        aria-hidden="true"
      >
        <defs>
          {/* Body gradient */}
          <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.head} />
            <stop offset="100%" stopColor={p.body} />
          </linearGradient>
          {/* Arm gradient */}
          <linearGradient id={`arm-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.head} />
            <stop offset="100%" stopColor={p.body} />
          </linearGradient>
          {/* Eye glow filter */}
          <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Antenna glow */}
          <filter id={`ant-${uid}`}>
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Shadow / ground reflection */}
        <ellipse cx="50" cy="148" rx="22" ry="4" fill={p.glow} opacity="0.35" />

        {/* ── ANTENNA ── */}
        <rect x="46.5" y="6" width="7" height="22" rx="3.5" fill={p.dark} />
        {/* Glowing antenna tip */}
        <circle cx="50" cy="6" r="5.5" fill={p.dark} />
        <circle cx="50" cy="6" r="4" fill={p.accent} className="antenna-tip" />
        <circle cx="50" cy="6" r="4" fill={p.accent} filter={`url(#ant-${uid})`} opacity="0.7" />

        {/* ── HEAD ── */}
        <rect x="18" y="24" width="64" height="52" rx="16" fill={`url(#body-${uid})`} />
        {/* Head highlight */}
        <rect x="22" y="26" width="56" height="24" rx="12" fill="white" opacity="0.05" />
        {/* Visor / screen */}
        <rect x="24" y="30" width="52" height="38" rx="12" fill={p.dark} opacity="0.75" />
        {/* Scan line on visor */}
        <rect x="24" y="42" width="52" height="2" rx="1" fill={p.accent} opacity="0.25" className="scan-line" />

        {/* ── EYES ── */}
        {/* Left eye (in RTL context this appears on the right visually) */}
        <g className="robot-eye-left" filter={`url(#glow-${uid})`} style={{ transformOrigin: "36px 50px" }}>
          <ellipse cx="36" cy="50" rx="7" ry="8" fill={p.dark} />
          <ellipse cx="36" cy="50" rx="5.5" ry="6.5" fill={p.eye} opacity="0.9" />
          <ellipse cx="36" cy="50" rx="3" ry="3.5" fill={p.dark} />
          <circle cx="38" cy="47" r="1.5" fill="white" opacity="0.8" />
        </g>
        {/* Right eye */}
        <g className="robot-eye-right" filter={`url(#glow-${uid})`} style={{ transformOrigin: "64px 50px" }}>
          <ellipse cx="64" cy="50" rx="7" ry="8" fill={p.dark} />
          <ellipse cx="64" cy="50" rx="5.5" ry="6.5" fill={p.eye} opacity="0.9" />
          <ellipse cx="64" cy="50" rx="3" ry="3.5" fill={p.dark} />
          <circle cx="66" cy="47" r="1.5" fill="white" opacity="0.8" />
        </g>

        {/* Smile */}
        <path
          d="M 39 63 Q 50 71 61 63"
          stroke={p.accent}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* ── NECK ── */}
        <rect x="42" y="74" width="16" height="10" rx="4" fill={p.dark} opacity="0.8" />

        {/* ── BODY ── */}
        <rect x="16" y="81" width="68" height="54" rx="16" fill={`url(#body-${uid})`} />
        {/* Body highlight */}
        <rect x="20" y="83" width="60" height="20" rx="10" fill="white" opacity="0.05" />
        {/* Chest panel base */}
        <rect x="27" y="89" width="46" height="38" rx="10" fill={p.dark} opacity="0.55" />

        {/* Accessory content (variant-specific) */}
        <Accessory variant={variant} p={p} />

        {/* ── ARMS ── */}
        <rect x="2" y="83" width="13" height="38" rx="6.5" fill={`url(#arm-${uid})`} />
        <rect x="85" y="83" width="13" height="38" rx="6.5" fill={`url(#arm-${uid})`} />
        {/* Hands */}
        <circle cx="8.5" cy="122" r="7" fill={p.dark} />
        <circle cx="91.5" cy="122" r="7" fill={p.dark} />
        <circle cx="8.5" cy="122" r="4" fill={p.body} opacity="0.5" />
        <circle cx="91.5" cy="122" r="4" fill={p.body} opacity="0.5" />

        {/* ── LEGS ── */}
        <rect x="27" y="132" width="18" height="14" rx="6" fill={p.dark} />
        <rect x="55" y="132" width="18" height="14" rx="6" fill={p.dark} />
        {/* Feet */}
        <rect x="23" y="142" width="26" height="7" rx="3.5" fill={`url(#body-${uid})`} />
        <rect x="51" y="142" width="26" height="7" rx="3.5" fill={`url(#body-${uid})`} />
      </svg>
    </div>
  );
}

export default RobotMascot;
