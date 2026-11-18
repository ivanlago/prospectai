import Link from "next/link";
import { Building2, LayoutDashboard, ScanLine, Search, PanelsTopLeft, Monitor } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, requireAdmin } from "@/auth";
import { ThemeToggle } from "@/components/theme";

const links = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/pesquisas", label: "Pesquisas", icon: Search },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/oportunidades", label: "Oportunidades", icon: PanelsTopLeft },
  { href: "/sites", label: "Sites gerados", icon: Monitor },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  async function logout() {
    "use server";
    await requireAdmin();
    await getAuth().api.signOut({ headers: await headers() });
    redirect("/entrar");
  }

  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark"><ScanLine size={20} /></span> ProspectAI</Link>
      <nav aria-label="Menu principal">{links.map(({ href, label, icon: Icon }) =>
        <Link key={href} href={href}><Icon size={18} />{label}</Link>)}</nav>
      <div className="profile"><span className="avatar">A</span><div><strong>{admin.name}</strong><form action={logout}><button className="text-button">Sair</button></form></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><span>Área administrativa</span><ThemeToggle /></header>
      <main className="main">{children}</main>
    </div>
  </div>;
}
