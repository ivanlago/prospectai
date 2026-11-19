"use client";

export default function PanelError({ reset }: { reset: () => void }) {
  return <section className="panel padded stack" role="alert">
    <h1>Não foi possível carregar esta página</h1>
    <p>Tente carregar a página novamente.</p>
    <div><button className="button primary" type="button" onClick={reset}>Tentar novamente</button></div>
  </section>;
}
