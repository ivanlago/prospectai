import { Activity, ArrowUpRight, Briefcase, Car, MapPin, Sparkles, Utensils } from "lucide-react";
import { templates, type SiteContent, type TemplateId } from "@/features/site-content";
import styles from "./site-preview.module.css";

const illustrations = {
  beauty: Sparkles,
  salon: Sparkles,
  food: Utensils,
  auto: Car,
  health: Activity,
  dental: Activity,
  services: Briefcase,
} satisfies Record<TemplateId, typeof Sparkles>;

export function SitePreview({ content, template }: { content: SiteContent; template: TemplateId }) {
  const design = templates[template];
  const Illustration = illustrations[template];
  const hasServices = content.services.length > 0;
  return <article className={`${styles.preview} ${styles[design.style]}`}>
    <div className={styles.notice}>Prévia demonstrativa independente. Não representa um site oficial da empresa.</div>
    <header className={styles.header}>
      <strong>{content.name}</strong>
      <nav aria-label="Seções da demonstração">
        {hasServices && <a href="#demo-servicos">Serviços</a>}
        <a href="#demo-sobre">Sobre</a><a href="#demo-contato">Contato</a>
      </nav>
    </header>
    <section className={styles.hero}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{content.segment}</p>
        <h2>{content.copy.headline}</h2>
        <p>{content.copy.subtitle}</p>
        <a className={styles.cta} href={hasServices ? "#demo-servicos" : "#demo-sobre"}>
          {hasServices ? content.copy.action : "Saiba mais"}<ArrowUpRight size={16} aria-hidden="true" />
        </a>
        {template === "food" && <a className={styles.locationLink} href="#demo-localizacao">Como chegar</a>}
      </div>
      <div className={styles.art} aria-hidden="true"><Illustration strokeWidth={1.05} /></div>
    </section>
    <div className={styles.sections}>
      <section className={styles.services} id="demo-servicos"><h3>Serviços</h3>{hasServices ?
        <ul className={styles.serviceList}>{content.services.map((service, index) => <li key={`${index}:${service}`}>{service}</li>)}</ul>
        : <p>Serviços a confirmar.</p>}
      </section>
      <section id="demo-sobre"><h3>Sobre {content.name}</h3><p>{content.copy.about}</p></section>
      <section><h3>Diferenciais</h3><p>Informações a confirmar na revisão da demonstração.</p></section>
      <section id="demo-localizacao"><h3>Localização</h3><p className={styles.location}><MapPin size={18} aria-hidden="true" />{[content.city, content.state].join(", ")}</p>{content.address && <p>{content.address}</p>}</section>
      <section id="demo-contato"><h3>Contato</h3>
        {content.email && <p><a href={`mailto:${content.email}`}>{content.email}</a></p>}
        {content.whatsapp && <a className={styles.cta} href={`https://wa.me/${content.whatsapp}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
        {!content.email && !content.whatsapp && <p>Canais de contato aguardam confirmação.</p>}
      </section>
    </div>
    <footer className={styles.footer}><strong>{content.name}</strong><span>Prévia para revisão</span></footer>
  </article>;
}
