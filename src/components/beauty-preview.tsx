import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { SiteContent } from "@/features/site-content";
import styles from "./beauty-preview.module.css";

export function BeautyPreview({ content }: { content: SiteContent }) {
  const contact = content.whatsapp ? `https://wa.me/${content.whatsapp}` : content.email ? `mailto:${content.email}` : null;
  const hasServices = content.services.length > 0;

  return <article className={styles.preview}>
    <p className={styles.notice}>Prévia independente para demonstração.</p>
    <header className={styles.header}>
      <strong>{content.name}</strong>
      <nav aria-label="Seções da prévia de beleza">
        {hasServices && <a href="#beauty-services">Serviços</a>}
        <a href="#beauty-about">Sobre</a>
        <a href="#beauty-contact">Contato</a>
      </nav>
    </header>
    <section className={`${styles.hero}${content.photo ? ` ${styles.withPhoto}` : ""}`}>
      <div className={styles.intro}>
        <p className={styles.segment}>{content.segment}</p>
        <h2>{content.copy.headline}</h2>
        <p>{content.copy.subtitle}</p>
        {(contact || hasServices) && <a className={styles.cta} href={contact ? "#beauty-contact" : "#beauty-services"}>
          {contact ? "Entre em contato" : "Conheça os serviços"}<ArrowDown size={16} aria-hidden="true" />
        </a>}
      </div>
      {content.photo && <div className={styles.photo}>
        <Image src={content.photo} alt={`Foto fornecida para ${content.name}`} fill unoptimized sizes="(max-width: 1000px) 90vw, 45vw" />
      </div>}
    </section>
    {hasServices && <section className={styles.services} id="beauty-services">
      <h3>Serviços</h3>
      <ul>{content.services.map((service, index) => <li key={`${service}:${index}`}>{service}</li>)}</ul>
    </section>}
    <section className={styles.about} id="beauty-about">
      <h3>Sobre {content.name}</h3>
      <p>{content.copy.about}</p>
    </section>
    <footer className={styles.contact} id="beauty-contact">
      <h3>Contato e localização</h3>
      <p>{content.city}, {content.state}</p>
      {content.address && <p>{content.address}</p>}
      {content.whatsapp && <a href={`https://wa.me/${content.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={15} aria-hidden="true" /></a>}
      {content.email && <a href={`mailto:${content.email}`}>{content.email}</a>}
      {!contact && <p>Canais de contato aguardam confirmação.</p>}
    </footer>
  </article>;
}
