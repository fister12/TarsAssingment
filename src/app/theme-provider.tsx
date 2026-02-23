"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply dark theme by default
    document.documentElement.classList.add("dark");
  }, []);

  return children;
}
