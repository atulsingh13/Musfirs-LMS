import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = activeTheme === "dark";

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full"
        aria-label="Toggle theme"
      >
        <Moon className="size-5 text-slate-700 transition-all" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="size-4 text-yellow-400 transition-all" />
      ) : (
        <Moon className="size-4 text-slate-700 transition-all dark:text-slate-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
