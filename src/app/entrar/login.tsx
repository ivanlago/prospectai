"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Login({ recovery, token }: { recovery?: boolean; token?: string }) {
  const [mode, setMode] = useState(token === undefined ? "login" : "reset");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const route = mode === "login" ? "sign-in/email" : mode === "reset" ? "reset-password" : "request-password-reset";
    const body = mode === "login" ? { email, password } : mode === "reset" ? { token, newPassword: password } : { email, redirectTo: "/redefinir" };

    setPending(true);
    setNotice("");
    try {
      const response = await fetch(`/api/auth/${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 429) setNotice("Muitas tentativas. Aguarde um minuto.");
      else if (response.status >= 500) setNotice("O serviço de autenticação está indisponível. Tente novamente.");
      else if (!response.ok) setNotice(mode === "login" ? "E-mail ou senha inválidos." : "Não foi possível concluir. Confira os dados e tente novamente.");
      else if (mode === "request") setNotice("Se o e-mail estiver cadastrado, você receberá um link.");
      else {
        router.replace(mode === "login" ? "/" : "/entrar");
        router.refresh();
      }
    } catch {
      setNotice("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="stack">
    {mode !== "reset" && <label>E-mail<input name="email" type="email" required maxLength={254} autoComplete="username" /></label>}
    {mode !== "request" && <label>{mode === "reset" ? "Nova senha" : "Senha"}<input name="password" type="password" required minLength={mode === "reset" ? 14 : 1} maxLength={128} autoComplete={mode === "reset" ? "new-password" : "current-password"} /></label>}
    {notice && <p role="status" className="feedback">{notice}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Aguarde…" : { login: "Entrar", request: "Enviar link", reset: "Salvar nova senha" }[mode]}</button>
    {recovery && <button className="text-button" type="button" onClick={() => {
      setNotice("");
      setMode(mode === "login" ? "request" : "login");
    }}>{mode === "login" ? "Esqueci minha senha" : "Voltar ao login"}</button>}
  </form>;
}
