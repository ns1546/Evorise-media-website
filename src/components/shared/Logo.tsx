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
    if (variant === "white") {
      return (
        <img
          src="/logo-mark-white.png"
          alt="EVORISE MEDIA"
          width={dim.mark}
          height={dim.mark}
          className={"shrink-0 object-contain " + className}
        />
      );
    }
    return (
      <img
        src="/logo-mark-dark.png"
        alt="EVORISE MEDIA"
        width={dim.mark}
        height={dim.mark}
        className={"shrink-0 object-contain " + className}
      />
    );
  }

  // When variant="white" (for dark surfaces like Admin sidebar, Login dark hero, or dark footer):
  // Directly render the WHITE logo on 100% TRANSPARENT background — ZERO white box, ZERO pill wrapper!
  if (variant === "white") {
    return (
      <div className={"flex items-center shrink-0 " + className}>
        <img
          src="/logo-tight-white.png"
          alt="EVORISE MEDIA"
          width={dim.width}
          height={dim.height}
          className="object-contain shrink-0"
          style={{ height: dim.height, width: "auto" }}
        />
      </div>
    );
  }

  // When variant="dark" (for light surfaces):
  if (variant === "dark") {
    return (
      <div className={"flex items-center shrink-0 " + className}>
        <img
          src="/logo-tight-dark.png"
          alt="EVORISE MEDIA"
          width={dim.width}
          height={dim.height}
          className="object-contain shrink-0"
          style={{ height: dim.height, width: "auto" }}
        />
      </div>
    );
  }

  // Default auto variant:
  // On light backgrounds displays black logo on 100% transparent background
  // If dark mode is active on html (dark:), displays white logo on 100% transparent background
  // ZERO white boxes or pill wrappers anywhere!
  return (
    <div className={"flex items-center shrink-0 " + className}>
      <img
        src="/logo-tight-dark.png"
        alt="EVORISE MEDIA"
        width={dim.width}
        height={dim.height}
        className="object-contain shrink-0 block dark:hidden"
        style={{ height: dim.height, width: "auto" }}
      />
      <img
        src="/logo-tight-white.png"
        alt="EVORISE MEDIA"
        width={dim.width}
        height={dim.height}
        className="object-contain shrink-0 hidden dark:block"
        style={{ height: dim.height, width: "auto" }}
      />
    </div>
  );
}
