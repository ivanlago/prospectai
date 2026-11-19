import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, MapPin } from "lucide-react";
import type { SiteContent } from "@/features/site-content";
import styles from "./dental-preview.module.css";

export function DentalPreview({ content }: { content: SiteContent }) {
  const hasContact = Boolean(content.whatsapp || content.email);
  const hasServices = content.services.length > 0;

  return <article className={styles.preview}>
    <p className={styles.notice}>Prévia demonstrativa independente. Não representa um site oficial da empresa.</p>
    <header className={styles.header}>
      <strong>{content.name}</strong>
      <nav aria-label="Seções da prévia odontológica">
        {hasServices && <a href="#dental-services">Tratamentos</a>}
        <a href="#dental-about">Sobre a clínica</a>
        <a href="#dental-contact">Contato</a>
      </nav>
    </header>
    <section className={`${styles.hero}${content.photo ? ` ${styles.withPhoto}` : ""}`}>
      <div className={styles.intro}>
        <p className={styles.segment}>{content.segment}</p>
        <h2>{content.copy.headline}</h2>
        <p>{content.copy.subtitle}</p>
        <a className={styles.cta} href={hasContact || !hasServices ? "#dental-contact" : "#dental-services"}>
          {hasContact ? "Fale com a clínica" : hasServices ? "Ver tratamentos" : "Ver localização"}
          <ArrowDownRight size={18} aria-hidden="true" />
        </a>
      </div>
      {content.photo && <div className={styles.photo}>
        <Image src={content.photo} alt={`Foto fornecida para ${content.name}`} fill unoptimized sizes="(max-width: 1000px) 90vw, 45vw" />
      </div>}
    </section>
    {hasServices && <section className={styles.services} id="dental-services">
      <h3>Tratamentos e serviços</h3>
      <ul>{content.services.map((service, index) => <li key={`${index}:${service}`}>{service}</li>)}</ul>
    </section>}
    <section className={styles.about} id="dental-about">
      <h3>Sobre {content.name}</h3>
      <p>{content.copy.about}</p>
    </section>
    <footer className={styles.contact} id="dental-contact">
      <div>
        <h3>Contato e localização</h3>
        <p><MapPin size={17} aria-hidden="true" />{content.city}, {content.state}</p>
        {content.address && <p>{content.address}</p>}
      </div>
      <div className={styles.links}>
        {content.whatsapp && <a href={`https://wa.me/${content.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a>}
        {content.email && <a href={`mailto:${content.email}`}>{content.email}</a>}
        {!hasContact && <p>Canais de contato aguardam confirmação.</p>}
      </div>
    </footer>
  </article>;
}
