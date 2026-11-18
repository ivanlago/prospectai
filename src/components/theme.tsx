"use client";

import { Moon } from "lucide-react";

export function ThemeToggle() {
  return <button type="button" className="button icon-button" title="Alternar tema" aria-label="Alternar tema" onClick={() => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
  }}><Moon size={17} /></button>;
}
