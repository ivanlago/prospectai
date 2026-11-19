"use client";

import { useActionState, useRef, useState } from "react";

type State = { message: string; url?: string };

export function SiteShareForm({ revision, action }: { revision: number; action: (state: State, form: FormData) => Promise<State> }) {
  const [state, submit, pending] = useActionState(action, { message: "" });
  const [copiedUrl, setCopiedUrl] = useState("");
  const link = useRef<HTMLInputElement>(null);
  return <>
    <form action={submit} className="stack">
      <input type="hidden" name="revision" value={revision} />
      <label>Validade do link<select name="days" defaultValue="7">
        <option value="1">1 dia</option><option value="7">7 dias</option><option value="30">30 dias</option>
      </select></label>
      <label className="toolbar"><input type="checkbox" name="approval" required /> Revisei e aprovo o conteúdo exibido para acesso por link.</label>
      <div><button className="button primary" disabled={pending}>{pending ? "Criando link…" : "Criar link de demonstração"}</button></div>
    </form>
    {state.message && <p className="feedback" role="status">{state.message}</p>}
    {state.url && <div className="stack">
      <label>Link de demonstração<input type="url" ref={link} value={state.url} readOnly /></label>
      <div><button type="button" className="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(state.url ?? "");
          setCopiedUrl(state.url ?? "");
        } catch {
          link.current?.focus();
          link.current?.select();
        }
      }}>{copiedUrl === state.url ? "Link copiado" : "Copiar link"}</button></div>
    </div>}
  </>;
}
