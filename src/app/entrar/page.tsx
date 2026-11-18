import { ScanLine } from "lucide-react";
import { resetEnabled } from "@/auth";
import { Login } from "./login";

export const dynamic = "force-dynamic";

export default function SignIn() {
  return <main className="login-shell">
    <div className="login-card">
      <div className="brand"><span className="brand-mark"><ScanLine size={20} /></span> ProspectAI</div>
      <h1>Acesse seu painel</h1>
      <Login recovery={resetEnabled()} />
    </div>
  </main>;
}
