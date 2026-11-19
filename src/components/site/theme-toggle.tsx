"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  function toggleTheme() {
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }

  return (
    <Button type="button" size="icon" variant="outline" onClick={toggleTheme} aria-label="Toggle light and dark theme">
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </Button>
  );
}
