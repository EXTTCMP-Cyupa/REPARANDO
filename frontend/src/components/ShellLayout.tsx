import { Link, useLocation } from "react-router-dom";
import { ClipboardList, Gavel, HardHat, ShieldCheck, Store, Wrench } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../lib/auth";

const nav = [
  { to: "/marketplace", label: "Marketplace", icon: Store, roles: ["CLIENT", "WORKER"] as UserRole[] },
  { to: "/bidding", label: "Licitación", icon: Gavel, roles: ["CLIENT", "WORKER"] as UserRole[] },
  { to: "/worker", label: "Trabajador", icon: HardHat, roles: ["WORKER"] as UserRole[] },
  { to: "/client", label: "Cliente", icon: Wrench, roles: ["CLIENT"] as UserRole[] },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["ADMIN"] as UserRole[] }
];

export function ShellLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const { session, logout } = useAuth();
  const currentRole = session?.user.role;
  const visibleNav = nav.filter((item) => (currentRole ? item.roles.includes(currentRole) : false));

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 rounded-3xl bg-brand-900 p-6 text-brand-50 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <ClipboardList className="h-7 w-7" />
          <h1 className="text-2xl font-extrabold tracking-tight">REPARANDO</h1>
        </div>
        <p className="text-sm text-brand-100">Plataforma segura para servicios del hogar con flujo de trabajo validado en app.</p>
        <nav className="mt-4 flex flex-wrap gap-3">
          {visibleNav.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition " +
                  (active ? "bg-brand-500 text-brand-900" : "bg-white/10 text-brand-50 hover:bg-white/20")
                }
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-brand-50 hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
