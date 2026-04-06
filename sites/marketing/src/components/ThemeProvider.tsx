"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "safefamily-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  // Resolve the actual theme to apply
  const resolveTheme = useCallback((themeValue: Theme): "light" | "dark" => {
    if (themeValue === "system") {
      return getSystemTheme();
    }
    return themeValue;
  }, [getSystemTheme]);

  // Apply theme to document
  const applyTheme = useCallback((resolved: "light" | "dark") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    setResolvedTheme(resolved);
  }, []);

  // Set theme and persist
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(resolveTheme(newTheme));
  }, [applyTheme, resolveTheme]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initialTheme = stored || "system";
    setThemeState(initialTheme);
    applyTheme(resolveTheme(initialTheme));
    setMounted(true);
  }, [applyTheme, resolveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        applyTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted, applyTheme, getSystemTheme]);

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const stored = localStorage.getItem('${STORAGE_KEY}');
              const theme = stored || 'system';
              const resolved = theme === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : theme;
              document.documentElement.classList.add(resolved);
            })();
          `,
        }}
      />
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
