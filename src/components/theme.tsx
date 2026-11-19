"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

const key = "prospectai-theme";

export function ThemeToggle() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem(key);
      if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
    } catch {
      // O tema continua disponível quando o armazenamento do navegador está bloqueado.
    }
  }, []);

  return <button type="button" className="button icon-button" title="Alternar tema" aria-label="Alternar tema" onClick={() => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem(key, root.dataset.theme);
    } catch {
      // A escolha continua aplicada ao documento aberto.
    }
  }}><Moon size={17} className="theme-moon" aria-hidden="true" /><Sun size={17} className="theme-sun" aria-hidden="true" /></button>;
}
