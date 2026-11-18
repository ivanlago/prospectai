import { MapPin } from "lucide-react";
import { templates, type SiteContent, type TemplateId } from "@/features/site-content";
import styles from "./site-preview.module.css";

export function SitePreview({ content, template }: { content: SiteContent; template: TemplateId }) {
  const design = templates[template];
  const hasServices = content.services.length > 0;
  return <article className={`${styles.preview} ${styles[design.style]}`}
    style={{ "--site-accent": design.accent, "--site-bg": design.background } as React.CSSProperties}>
    <div className={styles.notice}>Prévia demonstrativa independente. Não representa um site oficial da empresa.</div>
    <header className={styles.header}>
      <strong>{content.name}</strong>
      <nav aria-label="Seções da demonstração"><a href="#demo-sobre">Sobre</a><a href="#demo-contato">Contato</a></nav>
    </header>
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>{content.segment}</p>
        <h2>{content.copy.headline}</h2>
        <p>{content.copy.subtitle}</p>
        <a className={styles.cta} href={hasServices ? "#demo-servicos" : "#demo-sobre"}>{hasServices ? content.copy.action : "Saiba mais"}</a>
      </div>
      <div className={styles.art} aria-hidden="true"><span /><span /><span /></div>
    </section>
    <div className={styles.sections}>
      <section id="demo-servicos"><h3>Serviços</h3>{hasServices ?
        <ul className={styles.serviceList}>{content.services.map((service, index) => <li key={`${index}:${service}`}>{service}</li>)}</ul>
        : <p>Serviços a confirmar.</p>}
      </section>
      <section id="demo-sobre"><h3>Sobre {content.name}</h3><p>{content.copy.about}</p></section>
      <section><h3>Diferenciais</h3><p>Informações a confirmar na revisão da demonstração.</p></section>
      <section><h3>Localização</h3><p className={styles.location}><MapPin size={18} />{[content.city, content.state].join(", ")}</p>{content.address && <p>{content.address}</p>}</section>
      <section id="demo-contato"><h3>Contato</h3>
        {content.email && <p><a href={`mailto:${content.email}`}>{content.email}</a></p>}
        {content.whatsapp && <a className={styles.cta} href={`https://wa.me/${content.whatsapp}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
        {!content.email && !content.whatsapp && <p>Canais de contato aguardam confirmação.</p>}
      </section>
    </div>
    <footer className={styles.footer}><strong>{content.name}</strong><span>Prévia para revisão</span></footer>
  </article>;
}
