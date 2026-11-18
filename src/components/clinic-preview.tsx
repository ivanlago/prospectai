import { ArrowDown, ArrowUpRight, Mail, MapPin, MessageCircle } from "lucide-react";
import type { SiteContent } from "@/features/site-content";
import styles from "./clinic-preview.module.css";

export function ClinicPreview({ content }: { content: SiteContent }) {
  const hasServices = content.services.length > 0;
  const contactLabel = content.whatsapp ? "Falar pelo WhatsApp" : content.email ? "Enviar e-mail" : "Ver localização";
  const contactLink = content.whatsapp ? `https://wa.me/${content.whatsapp}` : content.email ? `mailto:${content.email}` : "#clinic-location";

  return <article className={styles.clinic}>
    <p className={styles.notice}>Prévia demonstrativa independente. Não representa um site oficial da empresa.</p>
    <header className={styles.header}>
      <strong>{content.name}</strong>
      <nav aria-label="Seções do novo template">
        {hasServices && <a href="#clinic-services">Serviços</a>}
        <a href="#clinic-about">Sobre</a>
        <a href="#clinic-location">Localização</a>
        <a href="#clinic-contact">Contato</a>
      </nav>
    </header>
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>{content.segment}</p>
        <h2>{content.copy.headline}</h2>
        <p className={styles.subtitle}>{content.copy.subtitle}</p>
        <div className={styles.actions}>
          <a className={styles.cta} href={contactLink}
            target={content.whatsapp ? "_blank" : undefined} rel={content.whatsapp ? "noreferrer" : undefined}>
            {contactLabel}<ArrowUpRight size={16} aria-hidden="true" />
          </a>
          {hasServices && <a href="#clinic-services">Conheça os serviços <ArrowDown size={15} aria-hidden="true" /></a>}
        </div>
      </div>
      <div className={styles.art} aria-hidden="true"><span /><span /><span /></div>
    </section>
    {hasServices && <section className={styles.services} id="clinic-services">
      <h3>Serviços</h3>
      <ul>{content.services.map((service, index) => <li key={`${service}:${index}`}>{service}</li>)}</ul>
    </section>}
    <section className={styles.about} id="clinic-about">
      <h3>Sobre {content.name}</h3><p>{content.copy.about}</p>
    </section>
    <div className={styles.details}>
      <section id="clinic-location">
        <h3><MapPin size={18} aria-hidden="true" />Localização</h3>
        <p>{content.city}, {content.state}</p>{content.address && <p>{content.address}</p>}
      </section>
      <section id="clinic-contact">
        <h3>Contato</h3>
        {content.whatsapp && <a href={`https://wa.me/${content.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true" />WhatsApp</a>}
        {content.email && <a href={`mailto:${content.email}`}><Mail size={16} aria-hidden="true" />{content.email}</a>}
        {!content.whatsapp && !content.email && <p>Canais de contato aguardam confirmação.</p>}
      </section>
    </div>
    <footer className={styles.footer}>{content.name}</footer>
  </article>;
}
