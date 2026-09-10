import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { BackgroundBeams } from "@/components/ui/background-beams";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  /** Use Aceternity Background Beams instead of the default gradient. */
  backgroundVariant?: "gradient" | "beams";
}

export function AuthLayout({
  children,
  title,
  description,
  backgroundVariant = "gradient",
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10">
      {backgroundVariant === "beams" ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-neutral-950"
          />
          <BackgroundBeams className="pointer-events-none z-0" />
        </>
      ) : (
        <>
          {/* Rich gradient atmosphere */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_10%_10%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(900px_circle_at_90%_20%,rgba(251,146,60,0.28),transparent_50%),radial-gradient(800px_circle_at_50%_100%,rgba(45,212,191,0.25),transparent_55%),linear-gradient(145deg,#0c4a6e_0%,#134e4a_45%,#1e3a5f_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:22px_22px]"
          />
        </>
      )}

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/" className="inline-flex">
            <BrandLogo background="dark" size="lg" />
          </Link>
        </div>

        {/* Frosted glass card */}
        <div className="rounded-2xl border border-white/25 bg-white/10 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-lg">
          <div className="mb-6 space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="text-sm text-white/70">{description}</p>
          </div>
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Musafir. All rights reserved.
        </p>
      </div>
    </div>
  );
}
