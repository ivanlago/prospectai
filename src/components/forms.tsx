"use client";

import { startTransition, useActionState } from "react";

export function ActionForm({ action, children, label }: {
  action: (state: string, data: FormData) => Promise<string>; children: React.ReactNode; label: string;
}) {
  const [notice, dispatch, pending] = useActionState(action, "");
  return <form action={dispatch} onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }} className="stack">
    {children}
    {notice && <p className="feedback" role="status">{notice}</p>}
    <div><button className="button primary" disabled={pending}>{pending ? "Salvando…" : label}</button></div>
  </form>;
}

export function DeleteForm({ action, label }: { action: () => Promise<void>; label: string }) {
  return <form action={action} onSubmit={event => {
    if (!window.confirm(`${label}? Esta ação é permanente.`)) event.preventDefault();
  }}><button className="button danger">{label}</button></form>;
}
