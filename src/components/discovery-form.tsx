"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function DiscoveryForm({ action, categories }: {
  action: (state: string, form: FormData) => Promise<string>;
  categories: { value: string; label: string }[];
}) {
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
    <label>Categoria OpenStreetMap<select name="category" defaultValue="" required>
      <option value="" disabled>Selecione uma categoria</option>
      {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
    </select></label>
    <button className="button primary" disabled={pending}>{pending ? "Pesquisando…" : "Executar pesquisa"}</button>
    {message && <p role="status" className="feedback">{message}</p>}
  </form>;
}
