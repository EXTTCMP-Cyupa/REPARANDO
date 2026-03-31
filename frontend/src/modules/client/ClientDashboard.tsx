import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getClientWorkOrders, approveWorkNote, rejectWorkNote } from "../../lib/api";
import { ClientQuotationApprovalView } from "./ClientQuotationApprovalView";

const steps = ["DIAGNOSTICO", "COTIZADO", "EN_PROCESO", "FINALIZADO"] as const;

type ClientWorkOrder = {
  id: string;
  clientId: string;
  workerId: string;
  status: string;
  quotationLaborCost?: number | null;
  quotationMaterialsCost?: number | null;
  clientApprovalDate?: string | null;
  completedAt?: string | null;
  workNotes?: Array<{
    description: string;
    additionalCost: number;
    evidencePhotos: string;
    createdAt: string;
    clientApproved: boolean | null;
  }>;
};

export function ClientDashboard() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<ClientWorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "quotation-approval" | "work-notes">("orders");
  const [reviewingNoteKey, setReviewingNoteKey] = useState<string | null>(null);

  const refreshOrders = () => {
    if (!session) return;

    setLoadingOrders(true);
    getClientWorkOrders(session.user.userId, session.accessToken)
      .then((items) => {
        setOrders(items);
        setError(null);
        setSelectedOrderId((current) => {
          if (current && items.some((item) => item.id === current)) {
            return current;
          }
          return items[0]?.id ?? null;
        });
      })
      .catch(() => {
        setOrders([]);
        setError("No fue posible cargar tus órdenes.");
      })
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => {
    if (!session) return undefined;

    refreshOrders();
    const interval = window.setInterval(() => refreshOrders(), 10000);
    return () => window.clearInterval(interval);
  }, [session]);

  const latestOrder = orders[0];
  const currentStep = useMemo(() => {
    if (!latestOrder) return -1;
    return steps.findIndex((step) => step === latestOrder.status);
  }, [latestOrder]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const inProgressOrders = orders.filter((order) => order.status !== "FINALIZADO");
  const completedOrders = orders.filter((order) => order.status === "FINALIZADO");
  const quotationPendingOrders = orders.filter((order) => !!order.quotationLaborCost && !order.clientApprovalDate);
  const selectedOrderPendingQuotation = !!selectedOrder && !!selectedOrder.quotationLaborCost && !selectedOrder.clientApprovalDate;

  const onApproveWorkNote = async (workOrderId: string, noteIndex: number) => {
    if (!session) return;
    try {
      setReviewingNoteKey(`${workOrderId}-${noteIndex}`);
      await approveWorkNote(workOrderId, noteIndex, session.user.userId, session.accessToken);
      refreshOrders();
    } finally {
      setReviewingNoteKey(null);
    }
  };

  const onRejectWorkNote = async (workOrderId: string, noteIndex: number) => {
    if (!session) return;
    try {
      setReviewingNoteKey(`${workOrderId}-${noteIndex}`);
      await rejectWorkNote(workOrderId, noteIndex, session.user.userId, session.accessToken);
      refreshOrders();
    } finally {
      setReviewingNoteKey(null);
    }
  };

  return (
    <section className="grid gap-4">
      <article className="card">
        <div className="mb-4 flex items-center justify-between">
          <p className="badge">Seguimiento del Trabajo</p>
          <button
            onClick={refreshOrders}
            disabled={loadingOrders}
            className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-bold text-brand-900 disabled:opacity-60"
          >
            {loadingOrders ? "Actualizando..." : "Actualizar ahora"}
          </button>
        </div>
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
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              <p className="font-bold">Trabajos en proceso</p>
              <p className="mt-1 text-2xl font-extrabold text-brand-900">{inProgressOrders.length}</p>
              <p className="text-xs text-brand-700">Ya asignados a un técnico y en flujo de ejecución.</p>
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              <p className="font-bold">Trabajos finalizados</p>
              <p className="mt-1 text-2xl font-extrabold text-brand-900">{completedOrders.length}</p>
              <p className="text-xs text-brand-700">Órdenes cerradas y calificadas.</p>
            </div>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      </article>

      <article className="card">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-brand-200">
          {[
            { id: "orders", label: "Historial de Órdenes" },
            { id: "quotation-approval", label: "Aprobar Cotización" },
            { id: "work-notes", label: "Imprevistos" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={
                "rounded-t-lg px-4 py-2 text-sm font-bold " +
                (activeTab === tab.id ? "bg-brand-900 text-brand-50" : "bg-brand-100 text-brand-900 hover:bg-brand-200")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">Sin órdenes.</p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={
                    "cursor-pointer rounded-xl border p-4 transition " +
                    (selectedOrderId === order.id ? "border-brand-700 bg-brand-100" : "border-brand-100 bg-white hover:border-brand-300")
                  }
                >
                  <p className="font-bold">Orden #{order.id.slice(0, 8)}</p>
                  <p className="text-sm">Estado: {order.status}</p>
                  <p className="text-sm">Trabajador: {order.workerId}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "quotation-approval" && (
          <div className="space-y-3">
            {quotationPendingOrders.length === 0 ? (
              <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
                No tienes cotizaciones pendientes de aprobación.
              </p>
            ) : !selectedOrder ? (
              <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
                Selecciona una orden para revisar la cotización.
              </p>
            ) : !selectedOrderPendingQuotation ? (
              <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
                Esta orden no tiene cotización pendiente. Selecciona una orden en estado pendiente.
              </p>
            ) : (
              <ClientQuotationApprovalView
                workOrderId={selectedOrder.id}
                onSuccess={() => {
                  refreshOrders();
                  setActiveTab("orders");
                }}
              />
            )}
          </div>
        )}

        {activeTab === "work-notes" && (
          <div className="space-y-3">
            {!selectedOrder ? (
              <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
                Selecciona una orden para revisar imprevistos.
              </p>
            ) : !selectedOrder.workNotes || selectedOrder.workNotes.length === 0 ? (
              <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
                Esta orden no tiene notas de trabajo registradas.
              </p>
            ) : (
              selectedOrder.workNotes.map((note, index) => {
                const key = `${selectedOrder.id}-${index}`;
                const pending = note.clientApproved === null;
                return (
                  <article key={key} className="rounded-xl border border-brand-100 bg-white p-4">
                    <p className="font-bold">Imprevisto #{index + 1}</p>
                    <p className="text-sm">Detalle: {note.description}</p>
                    <p className="text-sm">Costo adicional: ${Number(note.additionalCost).toFixed(2)}</p>
                    <p className="text-sm">Evidencia: {note.evidencePhotos || "Sin evidencia"}</p>
                    <p className="text-sm">
                      Estado cliente:{" "}
                      {note.clientApproved === true ? "Aprobado" : note.clientApproved === false ? "Rechazado" : "Pendiente"}
                    </p>
                    {pending && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => onApproveWorkNote(selectedOrder.id, index)}
                          disabled={reviewingNoteKey === key}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                          Aprobar costo
                        </button>
                        <button
                          onClick={() => onRejectWorkNote(selectedOrder.id, index)}
                          disabled={reviewingNoteKey === key}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                          Rechazar costo
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}
      </article>
    </section>
  );
}
