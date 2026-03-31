import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const EMAIL_BY_ROLE = {
  ADMIN: "admin@reparando.app",
  WORKER: "worker@reparando.app",
  WORKER_PRO: "worker2@reparando.app",
  CLIENT: "client@reparando.app"
} as const;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(EMAIL_BY_ROLE.CLIENT);
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl items-center p-4">
      <form onSubmit={onSubmit} className="card w-full">
        <h1 className="mb-2 text-2xl font-extrabold">Iniciar sesión</h1>
        <p className="mb-4 text-sm">Accede según tu perfil para ver solo tus módulos.</p>

        <label className="mb-2 block text-sm font-semibold">Perfil demo</label>
        <select
          value={email}
          onChange={(e) => setEmail(e.target.value as typeof email)}
          className="mb-3 w-full rounded-lg border border-brand-200 bg-white px-3 py-2"
        >
          <option value={EMAIL_BY_ROLE.CLIENT}>Cliente</option>
          <option value={EMAIL_BY_ROLE.WORKER}>Trabajador</option>
          <option value={EMAIL_BY_ROLE.WORKER_PRO}>Trabajador Pro</option>
          <option value={EMAIL_BY_ROLE.ADMIN}>Administrador</option>
        </select>

        <label className="mb-2 block text-sm font-semibold">Contraseña</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="mb-3 w-full rounded-lg border border-brand-200 bg-white px-3 py-2"
        />

        {error && <p className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-brand-900 px-4 py-2 font-bold text-brand-50 disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
