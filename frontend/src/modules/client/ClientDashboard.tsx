import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getClientWorkOrders } from "../../lib/api";

const steps = ["DIAGNOSTICO", "COTIZADO", "EN_PROCESO", "FINALIZADO"] as const;

type ClientWorkOrder = {
  id: string;
  clientId: string;
  workerId: string;
  status: string;
};

export function ClientDashboard() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<ClientWorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    getClientWorkOrders(session.user.userId, session.accessToken)
      .then((items) => {
        setOrders(items);
        setError(null);
      })
      .catch(() => {
        setOrders([]);
        setError("No fue posible cargar tus órdenes.");
      });
  }, [session]);

  const latestOrder = orders[0];
  const currentStep = useMemo(() => {
    if (!latestOrder) return -1;
    return steps.findIndex((step) => step === latestOrder.status);
  }, [latestOrder]);

  return (
    <section className="grid gap-4">
      <article className="card">
        <p className="badge mb-4">Seguimiento del Trabajo</p>
        <ol className="grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => {
            const done = index <= currentStep;
            return (
              <li key={step} className="relative">
                <div
                  className={
                    "rounded-xl border p-4 text-center text-sm font-bold " +
                    (done ? "border-brand-700 bg-brand-100 text-brand-900" : "border-brand-100 bg-white text-brand-700")
                  }
                >
                  {step}
                </div>
              </li>
            );
          })}
        </ol>

        {!latestOrder ? (
          <p className="mt-4 rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
            Aún no tienes órdenes de trabajo registradas.
          </p>
        ) : (
          <div className="mt-4 rounded-xl border border-brand-100 bg-white p-4 text-sm">
            <p className="font-bold">Orden activa #{latestOrder.id.slice(0, 8)}</p>
            <p>Estado actual: {latestOrder.status}</p>
            <p>Técnico asignado: {latestOrder.workerId}</p>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      </article>

      <article className="card">
        <p className="badge mb-3">Historial de Órdenes</p>
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              <p className="font-bold">Orden #{order.id.slice(0, 8)}</p>
              <p>Estado: {order.status}</p>
              <p>Trabajador: {order.workerId}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
