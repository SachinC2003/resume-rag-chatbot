"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function ThemeToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="top-right" richColors closeButton theme={resolvedTheme} />;
}
