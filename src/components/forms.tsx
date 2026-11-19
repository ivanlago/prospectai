"use client";

import { startTransition, useActionState } from "react";

export function ActionForm({ action, children, label, executeLabel }: {
  action: (state: string, data: FormData) => Promise<string>; children: React.ReactNode; label: string; executeLabel?: string;
}) {
  const [notice, dispatch, pending] = useActionState(action, "");
  return <form action={dispatch} onSubmit={event => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }} className="stack" aria-busy={pending}>
    {children}
    {notice && <p className="feedback" role="status">{notice}</p>}
    {pending && executeLabel && <p className="feedback" role="status">Processando a solicitação…</p>}
    <div className="toolbar"><button className={executeLabel ? "button" : "button primary"} disabled={pending}>{pending ? "Aguarde…" : label}</button>
      {executeLabel && <button className="button primary" name="intent" value="execute" disabled={pending}>{executeLabel}</button>}</div>
  </form>;
}

export function DeleteForm({ action, label }: { action: () => Promise<void>; label: string }) {
  return <form action={action} onSubmit={event => {
    if (!window.confirm(`${label}? Esta ação é permanente.`)) event.preventDefault();
  }}><button className="button danger">{label}</button></form>;
}
