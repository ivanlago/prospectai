import Link from "next/link";

export function PageHeader({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="page-header"><div><h1>{title}</h1><p>{description}</p></div>
    {href && <Link className="button primary" href={href}>{action}</Link>}
  </div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Pagination({ page, more, href }: { page: number; more: boolean; href: (page: number) => string }) {
  if (page === 1 && !more) return null;
  return <nav className="pagination" aria-label="Paginação">
    {page > 1 && <Link className="button" href={href(page - 1)}>Anterior</Link>}
    <span>Página {page}</span>
    {more && <Link className="button" href={href(page + 1)}>Próxima</Link>}
  </nav>;
}

export function pageNumber(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
}
