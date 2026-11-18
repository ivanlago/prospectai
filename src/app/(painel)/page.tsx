import Link from "next/link";
import { Building2, CheckCircle2, Search, TrendingUp } from "lucide-react";
import { count, desc, gte, sql } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { Empty, PageHeader } from "@/components/controls";
import { getDb } from "@/db";
import { companies, searches } from "@/db/schema";
import { formatDate, stageKeys, stageNames } from "@/domain";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await requireAdmin();
  const param = (await searchParams).periodo;
  const period = param === "7" || param === "30" ? Number(param) : 0;
  const since = period ? sql`now() - ${period} * interval '24 hours'` : null;
  const db = getDb();
  const [stages, recent, [saved]] = await Promise.all([
    db.select({ stage: companies.stage, total: count() }).from(companies).where(since ? gte(companies.createdAt, since) : undefined).groupBy(companies.stage),
    db.select().from(companies).where(since ? gte(companies.createdAt, since) : undefined).orderBy(desc(companies.createdAt)).limit(5),
    db.select({ total: count() }).from(searches).where(since ? gte(searches.createdAt, since) : undefined),
  ]);
  const total = stages.reduce((sum, item) => sum + item.total, 0);
  const won = stages.find(item => item.stage === "won")?.total ?? 0;
  const metrics = [
    { label: "Empresas cadastradas", value: total, icon: Building2 },
    { label: "Pesquisas salvas", value: saved.total, icon: Search },
    { label: "Clientes convertidos", value: won, icon: CheckCircle2 },
    { label: "Taxa de conversão", value: total ? new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(won / total) : "—", icon: TrendingUp },
  ];
  return <>
    <PageHeader title="Visão geral" description="Acompanhe seus cadastros, pesquisas e oportunidades." href="/empresas/nova" action="Nova empresa" />
    <form className="toolbar period"><label htmlFor="periodo">Período de cadastro</label>
      <select id="periodo" name="periodo" defaultValue={String(period)}><option value="0">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select>
      <button className="button">Aplicar</button>
    </form>
    <div className="metrics">{metrics.map(({ label, value, icon: Icon }) =>
      <section key={label} className="panel metric"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span><strong>{value}</strong></section>)}</div>
    <div className="detail-grid dashboard-grid">
      <section className="panel padded"><div className="section-header"><h2>Funil comercial</h2><Link href="/oportunidades">Abrir funil</Link></div>
        {total === 0 ? <Empty>Cadastre uma empresa para acompanhar o funil.</Empty> : <ul className="bars">
          {stageKeys.map(stage => {
            const value = stages.find(item => item.stage === stage)?.total ?? 0;
            return <li key={stage}><span>{stageNames[stage]}</span><meter aria-label={stageNames[stage]} min={0} max={total} value={value} /><strong>{value}</strong></li>;
          })}
        </ul>}
      </section>
      <section className="panel padded"><div className="section-header"><h2>Empresas recentes</h2><Link href="/empresas">Ver todas</Link></div>
        {recent.length === 0 ? <Empty>Nenhum cadastro neste período.</Empty> :
          <ul className="recent">{recent.map(company => <li key={company.id}>
            <Link href={`/empresas/${company.id}`}>{company.name}</Link><span>{formatDate(company.createdAt)}</span></li>)}</ul>}
      </section>
    </div>
  </>;
}
