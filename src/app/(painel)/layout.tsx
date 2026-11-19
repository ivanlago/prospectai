import { LogOut } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, requireAdmin } from "@/auth";
import { PanelShell } from "@/components/panel-shell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  async function logout() {
    "use server";
    await requireAdmin();
    await getAuth().api.signOut({ headers: await headers() });
    redirect("/entrar");
  }

  return <PanelShell profile={
    <div className="profile">
      <span className="avatar sidebar-label" aria-hidden="true">{Array.from(admin.name.trim())[0]?.toLocaleUpperCase("pt-BR") || "A"}</span>
      <strong className="sidebar-label">{admin.name}</strong>
      <form action={logout}><button className="button panel-icon" aria-label="Sair" title="Sair"><LogOut size={17} aria-hidden="true" /></button></form>
    </div>
  }>{children}</PanelShell>;
}
