"use client";

import { ArrowUpRight, Building2, LayoutDashboard, Menu, Monitor, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, ScanLine, Search, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { ThemeToggle } from "./theme";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pesquisas", label: "Encontrar empresas", icon: Search },
  { href: "/oportunidades", label: "Oportunidades", icon: PanelsTopLeft },
  { href: "/sites", label: "Sites gerados", icon: Monitor },
  { href: "/empresas", label: "CRM", icon: Building2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function PanelShell({ children, profile }: { children: ReactNode; profile: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const active = links.find(({ href }) => pathname === href || (href !== "/" && pathname.startsWith(href + "/")));

  return <div className="shell" data-collapsed={collapsed} data-mobile-menu={mobileMenuOpen}>
    <a className="skip-link button" href="#conteudo">Pular para o conteúdo</a>
    <aside className="sidebar" onKeyDown={event => {
      if (event.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        mobileToggle.current?.focus();
      }
    }}>
      <div className="sidebar-heading">
        <Link className="brand" href="/" aria-label="ProspectAI, dashboard" onClick={() => setMobileMenuOpen(false)}>
          <span className="brand-mark"><ScanLine size={20} aria-hidden="true" /></span><span className="sidebar-label">ProspectAI</span>
        </Link>
        <button ref={mobileToggle} className="button panel-icon mobile-menu-toggle" type="button" aria-controls="menu-painel"
          aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>
      <div className="sidebar-body" id="menu-painel">
        <nav aria-label="Menu principal">{links.map(({ href, label, icon: Icon }) =>
          <Link key={href} href={href} aria-current={active?.href === href ? "page" : undefined}
            aria-label={label} title={label} onClick={() => setMobileMenuOpen(false)}>
            <Icon size={19} aria-hidden="true" /><span className="sidebar-label">{label}</span>
          </Link>)}</nav>
        {profile}
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-location">
          <button type="button" className="button panel-icon desktop-menu-toggle" aria-controls="menu-painel"
            aria-label="Barra lateral compacta" aria-pressed={collapsed}
            title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
          <span>{active?.label ?? "Painel"}</span>
        </div>
        <div className="topbar-actions">
          {pathname !== "/" && active?.href !== "/pesquisas" && <Link href="/pesquisas/nova" className="topbar-search" aria-label="Nova pesquisa" title="Nova pesquisa">
            <Search size={17} aria-hidden="true" /><span>Nova pesquisa</span><ArrowUpRight size={14} aria-hidden="true" />
          </Link>}
          <ThemeToggle />
        </div>
      </header>
      <main className="main" id="conteudo" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
