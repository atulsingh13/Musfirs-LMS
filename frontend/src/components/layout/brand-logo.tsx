import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export const BRAND_LOGO_LIGHT_BG = "/assets/logo/musafirs-logo.png";
export const BRAND_LOGO_DARK_BG = "/assets/logo/musafirs-white-nav.png";

type BrandLogoBackground = "light" | "dark" | "auto";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Compact mark for collapsed sidebar */
  compact?: boolean;
  /** Surface the logo sits on — auto follows app theme (dark mode = dark surfaces) */
  background?: BrandLogoBackground;
}

const sizeClasses = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
};

function resolveLogoSrc(
  background: BrandLogoBackground,
  isDarkTheme: boolean
): string {
  if (background === "light") return BRAND_LOGO_LIGHT_BG;
  if (background === "dark") return BRAND_LOGO_DARK_BG;
  return isDarkTheme ? BRAND_LOGO_DARK_BG : BRAND_LOGO_LIGHT_BG;
}

export function BrandLogo({
  className,
  size = "md",
  compact = false,
  background = "auto",
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkTheme = mounted && resolvedTheme === "dark";
  const src = resolveLogoSrc(background, isDarkTheme);

  return (
    <img
      src={src}
      alt="Musafir"
      className={cn(
        "w-auto shrink-0 object-contain",
        compact ? "h-8 max-w-[2.5rem] object-left" : sizeClasses[size],
        className
      )}
    />
  );
}
