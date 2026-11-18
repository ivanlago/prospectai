import Link from "next/link";
import { resetEnabled } from "@/auth";
import { Login } from "../entrar/login";

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="login-shell"><div className="login-card">
    <h1>Redefinir senha</h1>
    {resetEnabled() && typeof token === "string" && token ? <Login token={token} /> : <p>Link indisponível. <Link href="/entrar">Voltar ao login</Link></p>}
  </div></main>;
}
