"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "dark" ? Moon : Sun;
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted hover:text-ink"
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
