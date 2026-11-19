"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { discoverySources } from "@/integrations/discovery/registry";

export function DiscoveryForm({ action, sources }: {
  action: (state: string, form: FormData) => Promise<string>;
  sources: ReturnType<typeof discoverySources>;
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.value ?? "");
  const source = sources.find(item => item.value === sourceId);
  const [message, dispatch, pending] = useActionState(action, "");
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [pending, router]);
  return <form className="toolbar" onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }}>
    <label>Fonte<select name="provider" value={sourceId} onChange={event => setSourceId(event.target.value)} required>
      {sources.map(source => <option key={source.value} value={source.value}>{source.label}</option>)}
    </select></label>
    <label>Categoria OpenStreetMap<select key={sourceId} name="category" defaultValue="" required>
      <option value="" disabled>Selecione uma categoria</option>
      {source?.categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
    </select></label>
    <button className="button primary" disabled={pending}>{pending ? "Pesquisando…" : "Executar pesquisa"}</button>
    {message && <p role="status" className="feedback">{message}</p>}
  </form>;
}
