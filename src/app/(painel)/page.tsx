import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, MapPin, Plus, Search, TrendingUp } from "lucide-react";
import { count, desc, gte, sql } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { Empty } from "@/components/controls";
import { getDb } from "@/db";
import { companies, searches } from "@/db/schema";
import { formatDate, stageKeys, stageNames } from "@/domain";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await requireAdmin();
  const param = (await searchParams).periodo;
  const period = param === "7" || param === "30" ? Number(param) : 0;
  const since = period ? sql`now() - ${period} * interval '24 hours'` : null;
  const db = getDb();
  const companyPeriod = since ? gte(companies.createdAt, since) : undefined;
  const [stages, recent, [saved]] = await Promise.all([
    db.select({ stage: companies.stage, total: count() }).from(companies).where(companyPeriod).groupBy(companies.stage),
    db.select({ id: companies.id, name: companies.name, segment: companies.segment, city: companies.city, state: companies.state,
      stage: companies.stage, createdAt: companies.createdAt })
      .from(companies).where(companyPeriod).orderBy(desc(companies.createdAt), desc(companies.id)).limit(5),
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
    <h1>Visão geral</h1>
    <section className="discovery-hero" aria-labelledby="discovery-title">
      <div className="discovery-hero-content">
        <h2 id="discovery-title">Encontre empresas para prospectar</h2>
        <p>Pesquise por cidade, bairro e segmento para descobrir potenciais clientes.</p>
        <Link className="button discovery-cta" href="/pesquisas/nova">
          <Search size={18} aria-hidden="true" /> Iniciar pesquisa <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <div className="discovery-hero-art" aria-hidden="true"><Search strokeWidth={1.25} /></div>
    </section>
    <section className="dashboard-metrics stack" aria-labelledby="metrics-title">
      <div className="section-header">
        <h2 id="metrics-title">Indicadores comerciais</h2>
        <form className="toolbar period">
          <label htmlFor="periodo">Período de cadastro</label>
          <select id="periodo" name="periodo" defaultValue={String(period)}><option value="0">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select>
          <button className="button">Aplicar</button>
        </form>
      </div>
      <dl className="metrics">{metrics.map(({ label, value, icon: Icon }) =>
        <div key={label} className="panel metric">
          <dt>{label}<span className="metric-icon" aria-hidden="true"><Icon size={17} /></span></dt><dd>{value}</dd>
        </div>)}</dl>
    </section>
    <div className="detail-grid dashboard-grid">
      <section className="panel padded"><div className="section-header"><h2>Funil comercial</h2><Link className="dashboard-link" href="/oportunidades">Abrir funil <ArrowRight size={15} aria-hidden="true" /></Link></div>
        {total === 0 ? <Empty>Cadastre uma empresa para acompanhar o funil.</Empty> : <ul className="bars">
          {stageKeys.map(stage => {
            const value = stages.find(item => item.stage === stage)?.total ?? 0;
            return <li key={stage}><span>{stageNames[stage]}</span><meter aria-label={stageNames[stage]} min={0} max={total} value={value} /><strong>{value}</strong></li>;
          })}
        </ul>}
      </section>
      <section className="panel padded stack">
        <div className="section-header"><h2>Empresas recentes</h2><Link className="dashboard-link" href="/empresas">Ver todas <ArrowRight size={15} aria-hidden="true" /></Link></div>
        {recent.length === 0 ? <Empty>Nenhum cadastro neste período.</Empty> :
          <ul className="dashboard-companies">{recent.map(company => <li key={company.id}>
            <span className="metric-icon" aria-hidden="true"><Building2 size={17} /></span>
            <div className="dashboard-company-details">
              <Link href={`/empresas/${company.id}`}>{company.name}</Link>
              <span>{company.segment}</span>
              <span><MapPin size={13} aria-hidden="true" /> {company.city}, {company.state}</span>
            </div>
            <div className="dashboard-company-status">
              <span className="pill">{stageNames[company.stage]}</span>
              <time dateTime={company.createdAt.toISOString()}>{formatDate(company.createdAt)}</time>
            </div>
          </li>)}</ul>}
        <Link href="/empresas/nova" className="button dashboard-add"><Plus size={16} aria-hidden="true" /> Nova empresa</Link>
      </section>
    </div>
  </>;
}
