import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getWorkerWorkOrders } from "../../lib/api";

type WorkerWorkOrder = {
  id: string;
  status: "DIAGNOSTICO" | "COTIZADO" | "EN_PROCESO" | "FINALIZADO";
  description?: string;
  category?: string;
  quotationLaborCost?: number | null;
  quotationMaterialsCost?: number | null;
  completedAt?: string | null;
};

export function WorkerAllJobsView() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<WorkerWorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const items = await getWorkerWorkOrders(session.user.userId, session.accessToken);
      setOrders(items as WorkerWorkOrder[]);
    } catch {
      setOrders([]);
      setError("No fue posible cargar el historial de trabajos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    refresh();
    const interval = window.setInterval(() => {
      refresh();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [session]);

  const summary = useMemo(() => {
    return {
      total: orders.length,
      diagnostico: orders.filter((order) => order.status === "DIAGNOSTICO").length,
      cotizado: orders.filter((order) => order.status === "COTIZADO").length,
      enProceso: orders.filter((order) => order.status === "EN_PROCESO").length,
      finalizado: orders.filter((order) => order.status === "FINALIZADO").length
    };
  }, [orders]);

  const getStatusStyle = (status: WorkerWorkOrder["status"]) => {
    if (status === "FINALIZADO") return "bg-emerald-100 text-emerald-700";
    if (status === "EN_PROCESO") return "bg-brand-100 text-brand-900";
    if (status === "COTIZADO") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <section className="grid gap-4">
      <article className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-lg font-extrabold text-slate-900">Todos los Trabajos</p>
            <p className="text-xs text-slate-600">Historial completo y resumen rápido de tu operación.</p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-bold text-brand-900 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{summary.total}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Diagnóstico</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{summary.diagnostico}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Cotizado</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{summary.cotizado}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">En proceso</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-900">{summary.enProceso}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Finalizado</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{summary.finalizado}</p>
        </article>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

      <article className="card">
        {orders.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No tienes trabajos registrados.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{order.description || `Orden #${order.id.slice(0, 8)}`}</p>
                  <span className={"rounded-full px-2 py-1 text-xs font-bold " + getStatusStyle(order.status)}>{order.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">Categoría: {order.category || "Sin categoría"}</p>
                <p className="text-xs text-slate-500">
                  Resumen: Cotización ${Number(order.quotationLaborCost ?? 0).toFixed(2)} + Materiales ${Number(order.quotationMaterialsCost ?? 0).toFixed(2)}
                </p>
                {order.completedAt && <p className="text-xs text-slate-500">Finalizado: {new Date(order.completedAt).toLocaleString()}</p>}
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
