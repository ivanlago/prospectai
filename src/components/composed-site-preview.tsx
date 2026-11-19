import Image from "next/image";
import { ArrowRight, Briefcase, CircleCheck, Coffee, Cross, MapPin, Scissors, Sparkles, Smile, Wrench } from "lucide-react";
import { optionalSections, type ComposedSite, type TemplateId } from "@/features/site-content";
import styles from "./composed-site-preview.module.css";

const identities = {
  health: { Icon: Cross, services: "Serviços de atendimento" },
  dental: { Icon: Smile, services: "Tratamentos e serviços" },
  beauty: { Icon: Sparkles, services: "Serviços de beleza e estética" },
  salon: { Icon: Scissors, services: "Serviços do salão" },
  food: { Icon: Coffee, services: "O que oferecemos" },
  auto: { Icon: Wrench, services: "Serviços da oficina" },
  services: { Icon: Briefcase, services: "Como podemos ajudar" },
} satisfies Record<TemplateId, { Icon: typeof Cross; services: string }>;

function Hero({ content, template }: { content: ComposedSite; template: TemplateId }) {
  const { Icon } = identities[template];
  const services = content.services.length > 0;
  return <section className={styles.hero}>
    <div className={styles.intro}>
      <p className={styles.segment}>{content.segment}</p>
      <h2>{content.copy.headline}</h2>
      <p className={styles.subtitle}>{content.copy.subtitle}</p>
      <a className={styles.cta} href={services && content.copy.action === "Conheça os serviços" ? "#site-servicos" : "#site-sobre"}>
        {services ? content.copy.action : "Saiba mais"} <ArrowRight size={17} aria-hidden="true" />
      </a>
    </div>
    <div className={styles.art} aria-hidden="true"><Icon strokeWidth={1.15} /></div>
  </section>;
}

function Services({ content, title }: { content: ComposedSite; title: string }) {
  if (!content.services.length) return null;
  const descriptions = new Map(content.serviceDescriptions.map(item => [item.index, item.description]));
  return <section id="site-servicos" className={styles.services}>
    <h3>{title}</h3>
    <ul>{content.services.map((name, index) => <li key={`${name}:${index}`}>
      <h4>{name}</h4>{descriptions.has(index) && <p>{descriptions.get(index)}</p>}
    </li>)}</ul>
  </section>;
}

function About({ content }: { content: ComposedSite }) {
  return <section id="site-sobre" className={styles.about}>
    <h3>Sobre {content.name}</h3><p className={styles.proposition}>{content.valueProposition}</p><p>{content.copy.about}</p>
  </section>;
}

function Benefits({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <section className={styles.benefits}>
    <h3>Diferenciais</h3>
    <ul>{items.map((item, index) => <li key={`${item}:${index}`}><CircleCheck size={18} aria-hidden="true" />{item}</li>)}</ul>
  </section>;
}

function Gallery({ content }: { content: ComposedSite }) {
  if (!content.photo) return null;
  return <section id="site-galeria" className={styles.gallery}>
    <h3>Galeria</h3>
    <div><Image src={content.photo} alt={`Foto fornecida para ${content.name}`} fill unoptimized
      sizes="(max-width: 760px) 90vw, 65vw" /></div>
  </section>;
}

function Location({ content }: { content: ComposedSite }) {
  return <section id="site-localizacao" className={styles.location}>
    <h3>Localização</h3>
    <p><MapPin size={17} aria-hidden="true" /> {content.city}, {content.state}</p>
    {content.address && <p>{content.address}</p>}
  </section>;
}

function Contact({ email, whatsapp }: Pick<ComposedSite, "email" | "whatsapp">) {
  if (!email && !whatsapp) return null;
  return <section id="site-contato" className={styles.contact}>
    <h3>Contato</h3>
    {email && <a href={`mailto:${email}`}>{email}</a>}
    {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
  </section>;
}

export function ComposedSitePreview({ content, template }: { content: ComposedSite; template: TemplateId }) {
  const aboutFirst = template === "health" || template === "beauty" || template === "services";
  const about = <About content={content} />;
  const services = <Services content={content} title={identities[template].services} />;
  const sectionOrder = [...new Set([...content.optionalSections, ...optionalSections])];

  return <article className={styles.site} data-template={template} data-tone={content.tone}>
    <p className={styles.notice}>Prévia demonstrativa independente. Não representa um site oficial da empresa.</p>
    <header className={styles.header}>
      <strong>{content.name}</strong>
      <nav aria-label="Seções da demonstração">
        {content.services.length > 0 && <a href="#site-servicos">Serviços</a>}
        <a href="#site-sobre">Sobre</a>
        {content.photo && <a href="#site-galeria">Galeria</a>}
        <a href="#site-localizacao">Localização</a>
        {(content.email || content.whatsapp) && <a href="#site-contato">Contato</a>}
      </nav>
    </header>
    <Hero content={content} template={template} />
    <div className={styles.sections}>
      {aboutFirst ? <>{about}{services}</> : <>{services}{about}</>}
      {sectionOrder.map(section => section === "beneficios"
        ? <Benefits key={section} items={content.benefits} />
        : <Gallery key={section} content={content} />)}
      <div className={styles.details}><Location content={content} /><Contact email={content.email} whatsapp={content.whatsapp} /></div>
    </div>
    <footer className={styles.footer}><strong>{content.name}</strong><span>Demonstração independente</span></footer>
  </article>;
}
