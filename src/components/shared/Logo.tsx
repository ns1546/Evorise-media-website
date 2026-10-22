import React from "react";

interface LogoProps {
  variant?: "auto" | "dark" | "white";
  size?: "sm" | "md" | "lg";
  markOnly?: boolean;
  className?: string;
}

export function Logo({
  variant = "auto",
  size = "md",
  markOnly = false,
  className = "",
}: LogoProps) {
  // Dimensions calibrated to preserve perfect 832x609 aspect ratio of the original logo
  const dimensions = {
    sm: { width: 44, height: 32, mark: 28 },
    md: { width: 55, height: 40, mark: 34 },
    lg: { width: 78, height: 56, mark: 48 },
  };

  const dim = dimensions[size] || dimensions.md;

  if (markOnly) {
    return (
      <div className={"inline-flex items-center shrink-0 " + className}>
        <img
          src="/logo-mark-dark.png"
          alt="EVORISE MEDIA"
          width={dim.mark}
          height={dim.mark}
          className="shrink-0 object-contain"
        />
      </div>
    );
  }

  // If variant="white", it means the parent container has a dark background (e.g. dark admin sidebar or footer CTA)
  // Instead of turning the logo text white, we present the exact black logo on a clean, premium white badge
  if (variant === "white") {
    return (
      <div className={"inline-flex items-center shrink-0 bg-white/95 rounded-xl px-2 py-1 shadow-sm border border-white/20 " + className}>
        <img
          src="/logo-tight.png"
          alt="EVORISE MEDIA"
          width={dim.width}
          height={dim.height}
          className="object-contain shrink-0"
          style={{ height: dim.height - 4, width: "auto" }}
        />
      </div>
    );
  }

  // Standard display: The user's exact original logo (black EV mark + black EVORISE MEDIA text) with background removed
  return (
    <div className={"flex items-center shrink-0 " + className}>
      <img
        src="/logo-tight.png"
        alt="EVORISE MEDIA"
        width={dim.width}
        height={dim.height}
        className="object-contain shrink-0"
        style={{ height: dim.height, width: "auto" }}
      />
    </div>
  );
}
