/**
 * JKH JESAN Brand Logo — SVG mark + wordmark
 * Warm Studio Design System v5 — Amber Gold accent
 */

interface LogoProps {
  variant?: "auto" | "dark" | "white";
  size?: "sm" | "md" | "lg";
  markOnly?: boolean;
  className?: string;
}

export function Logo({ variant = "auto", size = "md", markOnly = false, className = "" }: LogoProps) {
  const sizes = {
    sm: { mark: 28, title: 13, sub: 7.5, gap: "0.5rem" },
    md: { mark: 34, title: 14.5, sub: 8, gap: "0.6rem" },
    lg: { mark: 42, title: 17, sub: 9, gap: "0.7rem" },
  };
  const s = sizes[size];

  // "auto" = ink text on light surface (default for header on cream bg)
  // "dark"  = same ink text
  // "white" = cream text for dark surfaces (footer CTA strip)
  const isLight = variant === "white";

  const titleColor  = isLight ? "#F8F4EC" : "#1A1F0F";
  const accentColor = "#C8900A";
  const subColor    = isLight ? "rgba(248, 244, 236, 0.45)" : "#6B6B5A";

  return (
    <div className={`flex items-center ${className}`} style={{ gap: s.gap, flexShrink: 0 }}>
      {/* ── SVG Mark — waveform bars on gold base ── */}
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Base — warm ink square with slight squircle */}
        <rect width="40" height="40" rx="10" fill="#1A1F0F" />

        {/* Subtle gold inner glow */}
        <rect width="40" height="40" rx="10" fill="url(#goldGlow)" opacity="0.4" />

        {/* Waveform bars — gold accent */}
        <rect x="7"  y="20" width="4" height="11" rx="2" fill="rgba(200, 144, 10, 0.50)" />
        <rect x="13" y="14" width="4" height="17" rx="2" fill="rgba(200, 144, 10, 0.75)" />
        <rect x="19" y="8"  width="4" height="23" rx="2" fill="#C8900A" />
        <rect x="25" y="15" width="4" height="16" rx="2" fill="rgba(200, 144, 10, 0.65)" />
        <rect x="31" y="21" width="3.5" height="10" rx="2" fill="rgba(200, 144, 10, 0.40)" />

        {/* Baseline pulse dot */}
        <circle cx="20" cy="35.5" r="1.5" fill="rgba(200, 144, 10, 0.55)" />

        <defs>
          <radialGradient id="goldGlow" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#C8900A" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C8900A" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* ── Wordmark ── */}
      {!markOnly && (
        <div style={{ lineHeight: 1 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: s.title,
              letterSpacing: "-0.035em",
              color: titleColor,
              lineHeight: 1,
            }}
          >
            EVORISE{" "}
            <span style={{ color: accentColor }}>MEDIA</span>
          </div>
          <div
            style={{
              fontSize: s.sub,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: subColor,
              marginTop: "3px",
            }}
          >
            Creative Academy
          </div>
        </div>
      )}
    </div>
  );
}
