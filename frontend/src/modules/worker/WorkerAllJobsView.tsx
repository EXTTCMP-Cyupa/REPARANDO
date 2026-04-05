import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getWorkerWorkOrders } from "../../lib/api";
import { CompletionView } from "./CompletionView";
import { DiagnosticView } from "./DiagnosticView";
import { QuotationView } from "./QuotationView";
import { WorkNoteView } from "./WorkNoteView";

type WorkerWorkOrder = {
  id: string;
  clientId: string;
  workerId: string;
  status: "DIAGNOSTICO" | "COTIZADO" | "EN_PROCESO" | "FINALIZADO";
  description?: string;
  category?: string;
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

const flowSteps: Array<WorkerWorkOrder["status"]> = ["DIAGNOSTICO", "COTIZADO", "EN_PROCESO", "FINALIZADO"];

function ProgressStepper({ status }: { status: WorkerWorkOrder["status"] }) {
  const currentIndex = flowSteps.findIndex((step) => step === status);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {flowSteps.map((step, index) => {
          const done = index <= currentIndex;
          return (
            <div key={step} className="flex items-center gap-2">
              <span
                className={
                  "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-extrabold " +
                  (done ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-500")
                }
              >
                {index + 1}
              </span>
              {index < flowSteps.length - 1 && (
                <span className={"h-1 w-10 rounded-full " + (index < currentIndex ? "bg-brand-700" : "bg-slate-200")} />
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-4 text-[11px] font-semibold text-slate-600">
        <span>Paso 1</span>
        <span>Paso 2</span>
        <span>Paso 3</span>
        <span>Paso 4</span>
      </div>
    </div>
  );
}

export function WorkerAllJobsView() {
  const { session } = useAuth();

  const [orders, setOrders] = useState<WorkerWorkOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnostic" | "quotation" | "work-note" | "completion">("diagnostic");

  const refreshOrders = () => {
    if (!session) return;
    setOrdersLoading(true);
    setOrdersError(null);

    getWorkerWorkOrders(session.user.userId, session.accessToken)
      .then((items) => {
        const typed = items as WorkerWorkOrder[];
        setOrders(typed);
        const nonFinalized = typed.filter((item) => item.status !== "FINALIZADO");
        setSelectedOrderId((current) => {
          if (current && nonFinalized.some((item) => item.id === current)) {
            return current;
          }
          return nonFinalized[0]?.id ?? null;
        });
      })
      .catch(() => {
        setOrders([]);
        setSelectedOrderId(null);
        setOrdersError("No fue posible cargar tus trabajos.");
      })
      .finally(() => setOrdersLoading(false));
  };

  useEffect(() => {
    if (!session) return;

    refreshOrders();

    const interval = window.setInterval(() => {
      refreshOrders();
    }, 9000);

    return () => window.clearInterval(interval);
  }, [session]);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId]);
  const visibleOrders = useMemo(() => orders.filter((order) => order.status !== "FINALIZADO"), [orders]);

  const canDiagnostic = selectedOrder?.status === "DIAGNOSTICO" && !selectedOrder.quotationLaborCost;
  const canQuotation = selectedOrder?.status === "DIAGNOSTICO" && !selectedOrder.quotationLaborCost;
  const waitingQuotationApproval =
    selectedOrder?.status === "COTIZADO" || (selectedOrder?.status === "DIAGNOSTICO" && !!selectedOrder?.quotationLaborCost);
  const canWorkNote = selectedOrder?.status === "EN_PROCESO";
  const canComplete = selectedOrder?.status === "EN_PROCESO";

  return (
    <section className="space-y-4">
      <article className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-extrabold text-slate-900">Mis Trabajos que Están en Progreso</p>
            <p className="text-xs text-slate-500">Sigue el estado de cada trabajo desde inicio hasta finalización.</p>
          </div>
          <button
            onClick={refreshOrders}
            disabled={ordersLoading}
            className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-bold text-brand-900 disabled:opacity-60"
            title="Recargar datos de trabajos"
          >
            {ordersLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {ordersError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <span className="inline-flex items-center gap-2"><AlertTriangle size={16} />{ordersError}</span>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {visibleOrders.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                No tienes trabajos pendientes o en proceso.
              </p>
            ) : (
              visibleOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={
                    "w-full rounded-xl border px-3 py-3 text-left transition " +
                    (selectedOrderId === order.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-200")
                  }
                >
                  <p className="font-bold text-slate-900">{order.description || `Orden #${order.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-slate-600">Estado: {order.status}</p>
                  <ProgressStepper status={order.status} />
                </button>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            {!selectedOrder ? (
              <p className="text-sm text-slate-600">Selecciona un trabajo para gestionar su flujo.</p>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-xl font-extrabold text-slate-900">Gestión de Trabajo ({selectedOrder.status})</p>
                  <p className="text-sm text-slate-600">{selectedOrder.description || `Orden #${selectedOrder.id.slice(0, 8)}`}</p>
                </div>

                <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                  {[
                    { id: "diagnostic", label: "Paso 1: Revisar", desc: "Inspecciona el problema" },
                    { id: "quotation", label: "Paso 2: Presupuestar", desc: "Envía precio" },
                    { id: "work-note", label: "Paso 3: Trabajo", desc: "Registra avances" },
                    { id: "completion", label: "Paso 4: Entregar", desc: "Finaliza" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as "diagnostic" | "quotation" | "work-note" | "completion")}
                      className={
                        "flex flex-col items-start rounded-lg px-3 py-2 text-xs font-bold transition " +
                        (activeTab === tab.id ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                      }
                      title={tab.desc}
                    >
                      <span>{tab.label}</span>
                      <span className="text-[10px] opacity-70">{tab.desc}</span>
                    </button>
                  ))}
                </div>

                {activeTab === "diagnostic" && (
                  canDiagnostic ? (
                    <DiagnosticView
                      workOrderId={selectedOrder.id}
                      onSuccess={() => {
                        refreshOrders();
                        setActiveTab("quotation");
                      }}
                    />
                  ) : (
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">El diagnóstico ya fue enviado para esta orden.</p>
                  )
                )}

                {activeTab === "quotation" && (
                  canQuotation ? (
                    <QuotationView
                      workOrderId={selectedOrder.id}
                      workerId={session?.user.userId ?? selectedOrder.workerId}
                      onSuccess={() => {
                        refreshOrders();
                        setActiveTab("work-note");
                      }}
                    />
                  ) : waitingQuotationApproval ? (
                    <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">
                      Ya enviaste la cotización. Esperando aprobación del cliente.
                    </p>
                  ) : (
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">La cotización ya fue gestionada en esta orden.</p>
                  )
                )}

                {activeTab === "work-note" && (
                  canWorkNote ? (
                    <WorkNoteView
                      workOrderId={selectedOrder.id}
                      notes={selectedOrder.workNotes || []}
                      onSuccess={() => {
                        refreshOrders();
                      }}
                    />
                  ) : (
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                      Esta orden no está en proceso. Los avances se habilitan en EN_PROCESO.
                    </p>
                  )
                )}

                {activeTab === "completion" && (
                  canComplete ? (
                    <CompletionView
                      workOrderId={selectedOrder.id}
                      onSuccess={() => {
                        refreshOrders();
                      }}
                    />
                  ) : (
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                      Solo puedes finalizar cuando la orden esté EN_PROCESO.
                    </p>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
