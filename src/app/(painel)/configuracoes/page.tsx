import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { ThemeToggle } from "@/components/theme";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  return <>
    <PageHeader title="Configurações" description="Consulte a sua conta e ajuste a aparência do painel." />
    <div className="detail-grid">
      <section className="panel padded stack">
        <h2>Conta administrativa</h2>
        <dl className="settings-account">
          <div><dt>Nome</dt><dd>{admin.name}</dd></div>
          <div><dt>E-mail</dt><dd>{admin.email}</dd></div>
        </dl>
      </section>
      <section className="panel padded stack">
        <h2>Aparência</h2>
        <div className="section-header"><p>Alterne entre claro e escuro neste navegador.</p><ThemeToggle /></div>
      </section>
    </div>
  </>;
}
