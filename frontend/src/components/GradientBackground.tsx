/**
 * Fixed ambient gradient layer for the glassmorphism UI.
 * Sits behind all app content so frosted panels can blur through it.
 */
export function GradientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden"
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-[#eef2ff] dark:bg-[#0b1020]" />

      {/* Soft color orbs */}
      <div className="absolute -top-24 -left-24 size-[42rem] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.45)_0%,transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(99,102,241,0.35)_0%,transparent_70%)]" />
      <div className="absolute top-1/4 -right-32 size-[38rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.4)_0%,transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(56,189,248,0.28)_0%,transparent_70%)]" />
      <div className="absolute -bottom-28 left-1/4 size-[44rem] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.38)_0%,transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(139,92,246,0.3)_0%,transparent_70%)]" />
      <div className="absolute bottom-1/3 right-1/4 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.28)_0%,transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(236,72,153,0.2)_0%,transparent_70%)]" />
      <div className="absolute top-1/2 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.55)_0%,transparent_65%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,transparent_65%)]" />

      {/* Subtle noise / mesh overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.35)_0%,transparent_45%,rgba(99,102,241,0.08)_100%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_50%,rgba(56,189,248,0.08)_100%)]" />
    </div>
  );
}
