import { AlertTriangle, Home, MapPin, ShieldAlert, UserRound, Wrench, HelpCircle, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getBusinessPolicy,
  getWorkerAccount,
  getWorkerWorkOrders,
  listServiceNeeds,
  submitBidProposal
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { DiagnosticView } from "./DiagnosticView";
import { QuotationView } from "./QuotationView";
import { WorkNoteView } from "./WorkNoteView";
import { CompletionView } from "./CompletionView";
import { HelpTooltip, InfoBox } from "../../components/HelpTooltip";

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

type ServiceNeedItem = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  status: "OPEN" | "ASSIGNED";
};

const flowSteps: Array<WorkerWorkOrder["status"]> = ["DIAGNOSTICO", "COTIZADO", "EN_PROCESO", "FINALIZADO"];

function ProgressStepper({ status }: { status: WorkerWorkOrder["status"] }) {
  const currentIndex = flowSteps.findIndex((step) => step === status);

  const statusDescriptions: Record<WorkerWorkOrder["status"], string> = {
    DIAGNOSTICO: "Revisando el problema",
    COTIZADO: "Esperando aprobación de precio",
    EN_PROCESO: "Realizando el trabajo",
    FINALIZADO: "Trabajo completo"
  };

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
                title={`Paso ${index + 1}: ${statusDescriptions[step]}`}
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
        <span title="Evaluación inicial del problema">Paso 1</span>
        <span title="Envío de presupuesto">Paso 2</span>
        <span title="Realización de trabajo">Paso 3</span>
        <span title="Entrega y cierre">Paso 4</span>
      </div>
    </div>
  );
}

export function WorkerDashboard() {
  const { session } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [policy, setPolicy] = useState({ leadCost: 1.5, trustCreditLimit: -3 });
  const [accountError, setAccountError] = useState<string | null>(null);

  const [orders, setOrders] = useState<WorkerWorkOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnostic" | "quotation" | "work-note" | "completion">("diagnostic");

  const [needs, setNeeds] = useState<ServiceNeedItem[]>([]);
  const [needsLoading, setNeedsLoading] = useState(false);
  const [needActionMessage, setNeedActionMessage] = useState<string | null>(null);
  const [postingNeedId, setPostingNeedId] = useState<string | null>(null);
  const [costByNeed, setCostByNeed] = useState<Record<string, string>>({});
  const [summaryByNeed, setSummaryByNeed] = useState<Record<string, string>>({});
  const [bidStatusByNeed, setBidStatusByNeed] = useState<
    Record<string, { tone: "pending" | "error"; message: string }>
  >({});

  const refreshAccount = async () => {
    if (!session) return;
    setAccountError(null);

    try {
      const account = await getWorkerAccount(session.user.userId, session.accessToken);
      setBalance(account.balance);
      setBlocked(account.blocked);
    } catch {
      setBalance(null);
      setBlocked(null);
      setAccountError("No fue posible cargar el saldo actual.");
    }
  };

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
        setOrdersError("No fue posible cargar tus órdenes.");
      })
      .finally(() => setOrdersLoading(false));
  };

  const refreshNeeds = () => {
    if (!session) return;
    setNeedsLoading(true);

    listServiceNeeds(undefined, session.accessToken)
      .then((items) => {
        const openNeeds = (items as ServiceNeedItem[]).filter((need) => need.status === "OPEN");
        setNeeds(openNeeds);
        setBidStatusByNeed((current) => {
          const next: Record<string, { tone: "pending" | "error"; message: string }> = {};
          for (const need of openNeeds) {
            if (current[need.id]) {
              next[need.id] = current[need.id];
            }
          }
          return next;
        });
      })
      .catch(() => {
        setNeeds([]);
      })
      .finally(() => setNeedsLoading(false));
  };

  const onApplyNeed = async (need: ServiceNeedItem) => {
    if (!session) return;

    const existingStatus = bidStatusByNeed[need.id];
    if (existingStatus?.tone === "pending") {
      setNeedActionMessage("✓ Ya postulaste a esta oferta. Espera que el cliente la revise y te contacte en los próximos días.");
      return;
    }

    const laborCost = Number(costByNeed[need.id] ?? "");
    const summary = (summaryByNeed[need.id] ?? "").trim();

    if (!Number.isFinite(laborCost) || laborCost <= 0) {
      setNeedActionMessage("⚠️ Ingresa el precio que cobrarías para poder postular.");
      return;
    }

    if (!summary) {
      setNeedActionMessage("⚠️ Escribe una propuesta breve (qué harías, cuánto subirá) para que el cliente te entienda.");
      return;
    }

    try {
      setPostingNeedId(need.id);
      setNeedActionMessage(null);
      await submitBidProposal(
        {
          needId: need.id,
          workerId: session.user.userId,
          laborCost,
          summary
        },
        session.accessToken
      );

      setNeedActionMessage("✅ Postulación enviada. El cliente la revisará pronto.");
      setBidStatusByNeed((current) => ({
        ...current,
        [need.id]: {
          tone: "pending",
          message: "Esperando que el cliente revise tu propuesta..."
        }
      }));
      setCostByNeed((current) => ({ ...current, [need.id]: "" }));
      setSummaryByNeed((current) => ({ ...current, [need.id]: "" }));
      refreshNeeds();
    } catch (error) {
      if (error instanceof Error) {
        setNeedActionMessage(`❌ Error: ${error.message}`);
        setBidStatusByNeed((current) => ({
          ...current,
          [need.id]: {
            tone: "error",
            message: error.message
          }
        }));
      } else {
        setNeedActionMessage("❌ No se pudo enviar tu postulación. Intenta de nuevo.");
        setBidStatusByNeed((current) => ({
          ...current,
          [need.id]: {
            tone: "error",
            message: "Error al postular"
          }
        }));
      }
    } finally {
      setPostingNeedId(null);
    }
  };

  useEffect(() => {
    if (!session) return;

    getBusinessPolicy(session.accessToken)
      .then((value) => {
        setPolicy({
          leadCost: Number(value.leadCost),
          trustCreditLimit: Number(value.trustCreditLimit)
        });
      })
      .catch(() => setPolicy({ leadCost: 1.5, trustCreditLimit: -3 }));

    refreshAccount();
    refreshOrders();
    refreshNeeds();

    const interval = window.setInterval(() => {
      refreshAccount();
      refreshOrders();
      refreshNeeds();
    }, 9000);

    return () => window.clearInterval(interval);
  }, [session]);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId]);
  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "FINALIZADO"), [orders]);
  const visibleOrders = useMemo(() => orders.filter((order) => order.status !== "FINALIZADO"), [orders]);
  const pendingApplications = useMemo(
    () => Object.values(bidStatusByNeed).filter((status) => status.tone === "pending").length,
    [bidStatusByNeed]
  );

  const canApplyJobs = blocked === false && balance !== null && balance >= policy.trustCreditLimit;
  const isNegativeBalance = balance !== null && balance < 0;

  const canDiagnostic = selectedOrder?.status === "DIAGNOSTICO" && !selectedOrder.quotationLaborCost;
  const canQuotation = selectedOrder?.status === "DIAGNOSTICO" && !selectedOrder.quotationLaborCost;
  const waitingQuotationApproval =
    selectedOrder?.status === "COTIZADO" || (selectedOrder?.status === "DIAGNOSTICO" && !!selectedOrder?.quotationLaborCost);
  const canWorkNote = selectedOrder?.status === "EN_PROCESO";
  const canComplete = selectedOrder?.status === "EN_PROCESO";

  return (
    <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <article className="card space-y-4 self-start">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-900">
            <Home size={14} />
            REPARANDO
          </div>
          <Wrench className="text-brand-700" size={18} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-brand-100 p-2 text-brand-900">
              <UserRound className="h-full w-full" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Trabajador</p>
              <p className="font-extrabold text-slate-900">{session?.user.email ?? "Sin sesión"}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Tu Saldo de Crédito</p>
              <HelpTooltip text="Cada trabajo que postulas descuenta crédito de tu saldo. Si baja bajo el límite, no podrás postular más." />
            </div>
            <p className={"mt-1 text-3xl font-extrabold " + (isNegativeBalance ? "text-red-600" : "text-emerald-600")}>
              {balance === null ? "--" : `$ ${balance.toFixed(2)}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">Límite permitido: ${policy.trustCreditLimit.toFixed(2)}</p>
            {blocked === true && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                <ShieldAlert size={14} />
                Cuenta bloqueada por bajo saldo
              </p>
            )}
            {blocked === false && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                ✓ Cuenta habilitada
              </p>
            )}
          </div>
        </div>

        {accountError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{accountError}</p>}

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Ofertas Disponibles para Postularse</p>
              <p className="text-xs text-slate-500">Licitaciones de clientes que buscan tu ayuda</p>
            </div>
            <button
              onClick={refreshNeeds}
              disabled={needsLoading}
              className="rounded-lg bg-brand-100 px-2 py-1 text-xs font-bold text-brand-900 disabled:opacity-60"
              title="Cargar últimas ofertas disponibles"
            >
              {needsLoading ? "..." : "Actualizar"}
            </button>
          </div>

          {!canApplyJobs && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
              <AlertTriangle size={14} />
              Tu saldo es muy bajo. Recarga crédito para poder postular.
            </div>
          )}

          <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700">
              Ofertas abiertas: {needs.length}
            </p>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800">
              Postulaciones pendientes: {pendingApplications}
            </p>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
            {needs.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">No hay ofertas abiertas por ahora.</p>
            ) : (
              needs.slice(0, 8).map((need) => (
                <article key={need.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {bidStatusByNeed[need.id] && (
                    <p
                      className={
                        "mb-2 rounded-lg px-2 py-1 text-xs font-semibold " +
                        (bidStatusByNeed[need.id].tone === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-700")
                      }
                    >
                      {bidStatusByNeed[need.id].message}
                    </p>
                  )}
                  <p className="font-bold text-slate-900">{need.title || "Trabajo disponible"}</p>
                  <p className="text-xs text-slate-600">{need.description}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} />
                    Quito
                  </p>
                  <div className="mt-2 grid gap-2">
                    <input
                      value={costByNeed[need.id] ?? ""}
                      onChange={(event) => setCostByNeed((current) => ({ ...current, [need.id]: event.target.value }))}
                      disabled={bidStatusByNeed[need.id]?.tone === "pending"}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      placeholder="Cuánto cobrarías"
                    />
                    <input
                      value={summaryByNeed[need.id] ?? ""}
                      onChange={(event) => setSummaryByNeed((current) => ({ ...current, [need.id]: event.target.value }))}
                      disabled={bidStatusByNeed[need.id]?.tone === "pending"}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      placeholder="Resumen de propuesta"
                    />
                    <button
                      onClick={() => onApplyNeed(need)}
                      disabled={!canApplyJobs || postingNeedId === need.id || bidStatusByNeed[need.id]?.tone === "pending"}
                      className="rounded-lg bg-brand-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {postingNeedId === need.id
                        ? "Postulando..."
                        : bidStatusByNeed[need.id]?.tone === "pending"
                          ? "Pendiente de aceptación"
                          : "Postular"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          {needActionMessage && <p className="mt-2 text-xs font-semibold text-slate-700">{needActionMessage}</p>}
        </div>
      </article>

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
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200 flex items-center gap-2">
            <AlertTriangle size={16} />
            No se pudieron cargar tus trabajos. Intenta actualizar.
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {visibleOrders.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                No tienes trabajos pendientes o en proceso. Revisa "Todos los trabajos" para ver finalizados.
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
                        "rounded-lg px-3 py-2 text-xs font-bold transition flex flex-col items-start " +
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
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">El diagnóstico ya fue enviado para esta orden.</p>
                  )
                )}

                {activeTab === "quotation" && (
                  canQuotation ? (
                    <QuotationView
                      workOrderId={selectedOrder.id}
                      workerId={selectedOrder.workerId}
                      onSuccess={() => {
                        refreshOrders();
                      }}
                    />
                  ) : waitingQuotationApproval ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      Cotización enviada. Espera aprobación del cliente para continuar.
                    </p>
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Esta orden ya no permite editar cotización.</p>
                  )
                )}

                {activeTab === "work-note" && (
                  canWorkNote ? (
                    <WorkNoteView
                      workOrderId={selectedOrder.id}
                      notes={selectedOrder.workNotes ?? []}
                      onSuccess={() => {
                        refreshOrders();
                      }}
                    />
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      Las notas de trabajo se habilitan en etapa EN_PROCESO.
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
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      La finalización se habilita cuando la orden está en EN_PROCESO.
                    </p>
                  )
                )}
              </>
            )}
          </div>
        </div>

        {activeOrders.length > 0 && (
          <InfoBox 
            title="¿Cómo funciona el sistema de crédito?"
            text={`Cada postulación te cuesta $${policy.leadCost.toFixed(2)}. Si tu saldo baja de $${policy.trustCreditLimit.toFixed(2)}, no podrás postular. Recarga crédito desde la sección de Finanzas → Depósitos.`}
            variant="info"
          />
        )}
      </article>
    </section>
  );
}
