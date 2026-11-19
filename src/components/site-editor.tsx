"use client";

import Link from "next/link";
import { useState } from "react";
import { ComposedSitePreview } from "./composed-site-preview";
import { ActionForm } from "./forms";
import { defaultEditor, sectionLabels, siteSections, type ComposedSite, type EditorOptions, type SiteSection, type TemplateId } from "@/features/site-content";
import styles from "./site-editor.module.css";

const paletteLabels = { template: "Do template", oceano: "Oceano", floresta: "Floresta", ameixa: "Ameixa", grafite: "Grafite" } as const;
const fonts = { template: "Do template", serifa: "Com serifa", "sem-serifa": "Sem serifa" } as const;
const spacing = { compacto: "Compacto", regular: "Regular", amplo: "Amplo" } as const;

type History = { revision: number; createdAt: string; restoredFrom: number | null }[];

export function SiteEditor({ projectId, template, content, revision, history, action }: {
  projectId: string; template: TemplateId; content: ComposedSite; revision: number; history: History;
  action: (state: string, data: FormData) => Promise<string>;
}) {
  const [selected, setSelected] = useState<SiteSection>("hero");
  const [mobile, setMobile] = useState(false);
  const [copy, setCopy] = useState(content.copy);
  const [valueProposition, setValueProposition] = useState(content.valueProposition);
  const [descriptions, setDescriptions] = useState(() =>
    content.services.map((_, index) => content.serviceDescriptions.find(item => item.index === index)?.description ?? ""));
  const [editor, setEditor] = useState(() => content.editor ?? defaultEditor(content, template));
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>();
  const index = editor.order.indexOf(selected);
  const hidden = editor.hidden.includes(selected);
  const serviceDescriptions = descriptions.flatMap((description, index) => description.trim() ? [{ index, description }] : []);
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bahia" });

  function move(offset: -1 | 1) {
    const order = [...editor.order];
    const next = index + offset;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    setEditor({ ...editor, order });
  }

  function preference<K extends "palette" | "font" | "spacing">(key: K, value: EditorOptions[K]) {
    setEditor({ ...editor, [key]: value });
  }

  return <>
    <ActionForm action={action} label="Salvar rascunho">
      <input type="hidden" name="base" value={revision} />
      <input type="hidden" name="document" value={JSON.stringify({ copy, valueProposition, serviceDescriptions, editor, removePhoto })} />
      <div className={styles.editor}>
        <section className="panel padded stack" aria-labelledby="estrutura">
          <h2 id="estrutura">Estrutura do site</h2>
          <ol className={styles.sections}>{editor.order.map(section => <li key={section}>
            <button type="button" className={`button ${section === selected ? "primary" : ""}`} aria-pressed={section === selected}
              onClick={() => setSelected(section)}>
              {sectionLabels[section]}{editor.hidden.includes(section) && " (oculta)"}
            </button>
          </li>)}</ol>
          <div className="toolbar">
            <button type="button" className="button" disabled={index === 0} onClick={() => move(-1)}>Subir seção</button>
            <button type="button" className="button" disabled={index === editor.order.length - 1} onClick={() => move(1)}>Descer seção</button>
          </div>
        </section>
        <section className={styles.preview} aria-labelledby="previa-editor">
          <div className="section-header">
            <h2 id="previa-editor">Prévia do rascunho</h2>
            <div className="toolbar">
              <button type="button" className="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button>
              <button type="button" className="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Celular</button>
            </div>
          </div>
          <div className={styles.device} data-mobile={mobile} data-selected={selected} onClick={event => {
            const target = event.target;
            if (!(target instanceof Element) || target.closest("a,button,input")) return;
            const section = siteSections.find(key => key === target.closest("[data-site-section]")?.getAttribute("data-site-section"));
            if (section) setSelected(section);
          }}>
            <ComposedSitePreview template={template} viewport={mobile ? "mobile" : "desktop"} content={{
              ...content, copy, valueProposition, serviceDescriptions, editor, photo: photoPreview ?? (removePhoto ? undefined : content.photo),
            }} />
          </div>
        </section>
        <section className="panel padded stack" aria-label="Propriedades">
          <h2>{sectionLabels[selected]}</h2>
          {selected !== "hero" && <label className="toolbar"><input type="checkbox" checked={hidden}
            onChange={event => setEditor({ ...editor, hidden: event.target.checked
              ? [...editor.hidden, selected] : editor.hidden.filter(section => section !== selected) })} /> Ocultar seção</label>}
          {selected === "hero" && <>
            <label>Título principal<input maxLength={100} value={copy.headline} onChange={event => setCopy({ ...copy, headline: event.target.value })} /></label>
            <label>Subtítulo<textarea maxLength={180} rows={3} value={copy.subtitle} onChange={event => setCopy({ ...copy, subtitle: event.target.value })} /></label>
            <label>Chamada para ação<select value={copy.action}
              onChange={event => setCopy({ ...copy, action: event.target.value === "Saiba mais" ? "Saiba mais" : "Conheça os serviços" })}>
              <option>Conheça os serviços</option><option>Saiba mais</option>
            </select></label>
          </>}
          {selected === "sobre" && <>
            <label>Proposta de valor<textarea maxLength={140} rows={3} value={valueProposition} onChange={event => setValueProposition(event.target.value)} /></label>
            <label>Apresentação<textarea maxLength={420} rows={5} value={copy.about} onChange={event => setCopy({ ...copy, about: event.target.value })} /></label>
          </>}
          {selected === "servicos" && (content.services.length
            ? content.services.map((service, position) => <label key={position}>Descrição de {service}
                <textarea maxLength={140} rows={3} value={descriptions[position]}
                  onChange={event => setDescriptions(current => current.map((description, index) =>
                    index === position ? event.target.value : description))} />
              </label>)
            : <p>Nenhum serviço foi confirmado na geração.</p>)}
          <div className="stack" hidden={selected !== "galeria"}>
            <label>Substituir foto<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={event => {
              const file = event.target.files?.[0];
              setPhotoPreview(undefined);
              if (!file || file.size > 500 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (event.target.files?.[0] === file && typeof reader.result === "string") setPhotoPreview(reader.result);
              };
              reader.readAsDataURL(file);
            }} /></label>
            <label className="toolbar"><input type="checkbox" name="authorizePhoto" /> Tenho permissão para usar a foto anexada.</label>
            {content.photo && <label className="toolbar"><input type="checkbox" checked={removePhoto}
              onChange={event => setRemovePhoto(event.target.checked)} /> Remover foto atual</label>}
          </div>
          <h2>Aparência do site</h2>
          <label>Paleta de cores<select value={editor.palette} onChange={event => preference("palette", event.target.value as EditorOptions["palette"])}>
            {Object.entries(paletteLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Tipografia<select value={editor.font} onChange={event => preference("font", event.target.value as EditorOptions["font"])}>
            {Object.entries(fonts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Espaçamento<select value={editor.spacing} onChange={event => preference("spacing", event.target.value as EditorOptions["spacing"])}>
            {Object.entries(spacing).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </section>
      </div>
    </ActionForm>
    <section className="panel padded stack">
      <div className="section-header"><h2>Histórico de revisões</h2><Link href={`/sites/${projectId}`}>Abrir prévia salva</Link></div>
      {revision > 0 && <ActionForm action={action} label="Restaurar revisão">
        <input type="hidden" name="base" value={revision} />
        <label>Revisão anterior<select name="restore" defaultValue="0">
          {history.filter(entry => entry.revision < revision).map(entry => <option key={entry.revision} value={entry.revision}>
            Revisão {entry.revision} · {date.format(new Date(entry.createdAt))}
          </option>)}
          <option value="0">Geração original</option>
        </select></label>
        <p>A restauração cria uma revisão nova.</p>
      </ActionForm>}
      <ul className="history">
        {history.map(entry => <li key={entry.revision}>Revisão {entry.revision} · {date.format(new Date(entry.createdAt))}
          {entry.revision === revision && " · Atual"}{entry.restoredFrom !== null && ` · Restaurada da revisão ${entry.restoredFrom}`}</li>)}
        <li>Revisão 0 · Geração original{revision === 0 && " · Atual"}</li>
      </ul>
    </section>
  </>;
}
