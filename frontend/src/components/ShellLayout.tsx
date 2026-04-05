import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  CircleDollarSign,
  Gavel,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  PanelTop,
  Plus,
  Search,
  Settings,
  User,
  WalletCards
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getWorkerAccount } from "../lib/api";

const BALANCE_VALUE_KEY = "reparando.balance.value";
const BALANCE_BLOCKED_KEY = "reparando.balance.blocked";
const BALANCE_BLOCK_THRESHOLD = -3;

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: string[];
  roles: Array<"ADMIN" | "WORKER" | "CLIENT">;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, match: ["/client", "/worker", "/admin", "/"], roles: ["CLIENT", "WORKER", "ADMIN"] },
  { to: "/marketplace", label: "Marketplace", icon: Search, match: ["/marketplace"], roles: ["CLIENT", "WORKER"] },
  { to: "/bidding", label: "Licitación", icon: Gavel, match: ["/bidding"], roles: ["CLIENT", "WORKER"] },
  { to: "/worker/jobs", label: "Mis Trabajos", icon: ClipboardList, match: ["/worker/jobs"], roles: ["WORKER"] },
  { to: "/client", label: "Estadísticas", icon: BarChart3, match: ["/client"], roles: ["CLIENT"] },
  { to: "/worker/finance", label: "Estadísticas", icon: BarChart3, match: ["/worker/finance"], roles: ["WORKER"] },
  { to: "/admin", label: "Estadísticas", icon: BarChart3, match: ["/admin"], roles: ["ADMIN"] },
  { to: "/marketplace", label: "Ayuda", icon: HelpCircle, match: ["/help"], roles: ["CLIENT", "WORKER", "ADMIN"] }
];

function defaultDashboardByRole(role?: "ADMIN" | "WORKER" | "CLIENT") {
  if (role === "WORKER") return "/worker";
  if (role === "ADMIN") return "/admin";
  return "/client";
}

function buildBreadcrumb(pathname: string): string[] {
  const clean = pathname.split("?")[0].split("#")[0];
  if (clean === "/") return ["Dashboard"];

  const tokenMap: Record<string, string> = {
    marketplace: "Marketplace",
    bidding: "Licitación",
    worker: "Trabajador",
    jobs: "Mis Trabajos",
    finance: "Finanzas",
    client: "Cliente",
    admin: "Admin"
  };

  return clean
    .split("/")
    .filter(Boolean)
    .map((token) => tokenMap[token] ?? token.charAt(0).toUpperCase() + token.slice(1));
}

export function ShellLayout({ children }: PropsWithChildren) {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number>(-1.5);

  const role = session?.user.role;
  const dashboardPath = defaultDashboardByRole(role);

  const visibleNav = useMemo(
    () => NAV_ITEMS.filter((item) => (role ? item.roles.includes(role) : false)),
    [role]
  );

  const breadcrumbs = useMemo(() => buildBreadcrumb(location.pathname), [location.pathname]);
  const activeNav = (item: NavItem) => item.match.some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`));

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    const updateBalance = async () => {
      if (!session) return;
      if (session.user.role !== "WORKER") {
        const local = Number(window.localStorage.getItem(BALANCE_VALUE_KEY));
        if (!Number.isNaN(local)) {
          if (!cancelled) setBalance(local);
          return;
        }
        if (!cancelled) setBalance(-1.5);
        return;
      }

      try {
        const account = await getWorkerAccount(session.user.userId, session.accessToken);
        if (!cancelled) {
          setBalance(Number(account.balance));
        }
      } catch {
        if (!cancelled) setBalance(-1.5);
      }
    };

    updateBalance();
    const interval = window.setInterval(updateBalance, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session]);

  useEffect(() => {
    const blocked = balance <= BALANCE_BLOCK_THRESHOLD;
    window.localStorage.setItem(BALANCE_VALUE_KEY, String(balance));
    window.localStorage.setItem(BALANCE_BLOCKED_KEY, String(blocked));
    window.dispatchEvent(
      new CustomEvent("reparando-balance-update", {
        detail: { balance, blocked }
      })
    );
  }, [balance]);

  const balanceBlocked = balance <= BALANCE_BLOCK_THRESHOLD;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(47,102,181,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef3fb_100%)] text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/95 p-5 backdrop-blur md:flex">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-900">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-slate-900">REPARANDO</p>
            <p className="text-[11px] text-slate-500">Centro de oportunidades</p>
          </div>
        </div>

        <nav className="space-y-2">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const to = item.to === "/" ? dashboardPath : item.to;
            const active = activeNav(item) || (item.to === "/" && location.pathname === dashboardPath);
            return (
              <Link
                key={`${item.label}-${item.to}`}
                to={to}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition " +
                  (active ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-900")
                }
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="font-bold text-slate-700">Mis finanzas</p>
          <p className={"mt-1 text-lg font-extrabold " + (balanceBlocked ? "text-red-600" : "text-brand-900")}>
            ${balance.toFixed(2)}
          </p>
          <p className={"mt-1 text-[11px] " + (balanceBlocked ? "text-red-600" : "text-slate-500")}>
            {balanceBlocked ? "Saldo crítico: límite alcanzado" : "Balance reactivo actualizado"}
          </p>
        </div>
      </aside>

      <div className="md:ml-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <div className="hidden min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
              <span>Inicio</span>
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="inline-flex items-center gap-2">
                  <ChevronDown size={12} className="rotate-[-90deg]" />
                  <span className="truncate">{crumb}</span>
                </span>
              ))}
            </div>

            <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:max-w-md">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Buscar"
              />
            </label>

            <Link
              to="/bidding"
              className="hidden items-center gap-2 rounded-xl bg-brand-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-800 md:inline-flex"
            >
              <Plus size={15} />
              Crear Oportunidad
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((state) => !state)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <User size={15} />
                Perfil
                <ChevronDown size={14} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="rounded-lg px-3 py-2 text-xs text-slate-500">
                    {session?.user.email ?? "usuario"}
                  </div>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                    <User size={15} /> Perfil
                  </button>
                  <button
                    type="button"
                    className={
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-100 " +
                      (balanceBlocked ? "text-red-600" : "text-slate-700")
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <WalletCards size={15} /> Mis Finanzas
                    </span>
                    <span className="font-bold">${balance.toFixed(2)}</span>
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                    <Settings size={15} /> Configuración
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                    <PanelTop size={15} /> Panel de Control
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={15} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 pb-24 pt-4 md:px-6 md:pb-8">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t border-slate-200 bg-white/90 px-2 py-2 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5 items-center gap-2 text-[11px] font-semibold text-slate-600">
          <Link to={dashboardPath} className="flex flex-col items-center gap-1 rounded-lg py-1">
            <LayoutDashboard size={16} />
            Inicio
          </Link>
          <Link to="/marketplace" className="flex flex-col items-center gap-1 rounded-lg py-1">
            <Search size={16} />
            Marketplace
          </Link>
          <Link to="/bidding" className="flex flex-col items-center gap-1 rounded-full bg-brand-900 py-2 text-white">
            <Plus size={16} />
            Crear
          </Link>
          <Link to={role === "WORKER" ? "/worker/jobs" : "/bidding"} className="flex flex-col items-center gap-1 rounded-lg py-1">
            {role === "WORKER" ? <ClipboardList size={16} /> : <Gavel size={16} />}
            {role === "WORKER" ? "Mis Trabajos" : "Oportunidades"}
          </Link>
          <button type="button" onClick={() => setMenuOpen((state) => !state)} className="flex flex-col items-center gap-1 rounded-lg py-1">
            <User size={16} />
            Perfil
          </button>
        </div>
      </nav>
    </div>
  );
}
