"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

const STORAGE_KEY = "talentdesk-theme";
const subscribers = new Set<() => void>();

function getThemeSnapshot(): Theme {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    return "dark";
  }
  return "dark";
}

function getResolvedThemeSnapshot(): Theme {
  return getThemeSnapshot();
}

function getServerThemeSnapshot(): Theme {
  return "dark";
}

function getServerResolvedThemeSnapshot(): Theme {
  return "dark";
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function notifySubscribers() {
  subscribers.forEach((callback) => callback());
}

function setThemePreference(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.warn("Could not save the selected theme.", error);
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  notifySubscribers();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getResolvedThemeSnapshot,
    getServerResolvedThemeSnapshot,
  );

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme: setThemePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
