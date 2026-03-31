import { AlertTriangle, CircleDollarSign, Home, MapPin, ShieldAlert, UserRound, Wrench } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  getBusinessPolicy,
  getWorkerAccount,
  getWorkerDeposits,
  getWorkerWorkOrders,
  listServiceNeeds,
  submitBidProposal,
  submitDepositReceipt,
  uploadDepositReceiptImage
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { DiagnosticView } from "./DiagnosticView";
import { QuotationView } from "./QuotationView";
import { WorkNoteView } from "./WorkNoteView";
import { CompletionView } from "./CompletionView";

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
        <span>Diagnóstico</span>
        <span>Cotización</span>
        <span>En Proceso</span>
        <span>Finalizado</span>
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

  const [depositAmount, setDepositAmount] = useState("");
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<"DEPOSITO" | "TRANSFERENCIA">("DEPOSITO");
  const [depositImagePath, setDepositImagePath] = useState<string | null>(null);
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMessage, setDepositMessage] = useState<string | null>(null);
  const [workerDeposits, setWorkerDeposits] = useState<
    Array<{
      id: string;
      amount: number;
      paymentMethod: "DEPOSITO" | "TRANSFERENCIA";
      imagePath: string;
      status: "APPROVED" | "PENDING" | "REJECTED";
      createdAt: string;
    }>
  >([]);

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
        setSelectedOrderId((current) => {
          if (current && typed.some((item) => item.id === current)) {
            return current;
          }
          return typed[0]?.id ?? null;
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
      .then((items) => setNeeds((items as ServiceNeedItem[]).filter((need) => need.status === "OPEN")))
      .catch(() => {
        setNeeds([]);
      })
      .finally(() => setNeedsLoading(false));
  };

  const refreshDeposits = () => {
    if (!session) return;

    getWorkerDeposits(session.user.userId, session.accessToken)
      .then((items) => {
        setWorkerDeposits(
          items.map((item) => ({
            id: item.id,
            amount: Number(item.amount),
            paymentMethod: item.paymentMethod,
            imagePath: item.imagePath,
            status: item.status,
            createdAt: item.createdAt
          }))
        );
      })
      .catch(() => {
        setWorkerDeposits([]);
      });
  };

  const onUploadDepositImage = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!session || !event.target.files?.[0]) return;

    try {
      setDepositBusy(true);
      setDepositMessage(null);
      const result = await uploadDepositReceiptImage(event.target.files[0], session.accessToken);
      setDepositImagePath(result.imagePath);
      setDepositMessage("Comprobante cargado correctamente.");
    } catch {
      setDepositImagePath(null);
      setDepositMessage("No fue posible subir el comprobante.");
    } finally {
      setDepositBusy(false);
      event.target.value = "";
    }
  };

  const onSubmitDeposit = async () => {
    if (!session) return;

    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositMessage("Ingresa un monto válido mayor a cero.");
      return;
    }

    if (!depositImagePath) {
      setDepositMessage("Debes subir el comprobante del depósito.");
      return;
    }

    try {
      setDepositBusy(true);
      setDepositMessage(null);
      await submitDepositReceipt(
        {
          workerId: session.user.userId,
          amount,
          paymentMethod: depositPaymentMethod,
          imagePath: depositImagePath
        },
        session.accessToken
      );

      setDepositAmount("");
      setDepositPaymentMethod("DEPOSITO");
      setDepositImagePath(null);
      setDepositMessage("Depósito enviado para validación administrativa.");
      refreshAccount();
      refreshDeposits();
    } catch {
      setDepositMessage("No fue posible registrar el depósito.");
    } finally {
      setDepositBusy(false);
    }
  };

  const onApplyNeed = async (need: ServiceNeedItem) => {
    if (!session) return;

    const laborCost = Number(costByNeed[need.id] ?? "");
    const summary = (summaryByNeed[need.id] ?? "").trim();

    if (!Number.isFinite(laborCost) || laborCost <= 0) {
      setNeedActionMessage("Ingresa cuánto cobrarías para postular.");
      return;
    }

    if (!summary) {
      setNeedActionMessage("Escribe un resumen corto de tu propuesta.");
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

      setNeedActionMessage("Postulación enviada correctamente.");
      setCostByNeed((current) => ({ ...current, [need.id]: "" }));
      setSummaryByNeed((current) => ({ ...current, [need.id]: "" }));
      refreshNeeds();
    } catch (error) {
      if (error instanceof Error) {
        setNeedActionMessage(error.message);
      } else {
        setNeedActionMessage("No fue posible postular al trabajo.");
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
    refreshDeposits();

    const interval = window.setInterval(() => {
      refreshAccount();
      refreshOrders();
      refreshNeeds();
      refreshDeposits();
    }, 9000);

    return () => window.clearInterval(interval);
  }, [session]);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId]);
  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "FINALIZADO"), [orders]);

  const canApplyJobs =
    blocked === false &&
    balance !== null &&
    balance >= policy.trustCreditLimit;

  const isNegativeBalance = balance !== null && balance < 0;

  const canDiagnostic = selectedOrder?.status === "DIAGNOSTICO" && !selectedOrder.quotationLaborCost;
  const canQuotation = selectedOrder?.status === "DIAGNOSTICO" && !selectedOrder.quotationLaborCost;
  const waitingQuotationApproval = selectedOrder?.status === "COTIZADO" || (selectedOrder?.status === "DIAGNOSTICO" && !!selectedOrder?.quotationLaborCost);
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
            <p className="text-xs font-semibold uppercase text-slate-500">Current Balance</p>
            <p className={"mt-1 text-3xl font-extrabold " + (isNegativeBalance ? "text-red-600" : "text-emerald-600")}>
              {balance === null ? "--" : `$ ${balance.toFixed(2)}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">Límite permitido: ${policy.trustCreditLimit.toFixed(2)}</p>
            {blocked === true && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                <ShieldAlert size={14} />
                Cuenta bloqueada por saldo
              </p>
            )}
            {blocked === false && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                Cuenta habilitada
              </p>
            )}
          </div>
        </div>

        {accountError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{accountError}</p>}

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-bold text-slate-900">Subir Comprobante Depósito</p>
          <div className="mt-2 grid gap-2">
            <input
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Monto del depósito"
            />
            <select
              value={depositPaymentMethod}
              onChange={(event) => setDepositPaymentMethod(event.target.value as "DEPOSITO" | "TRANSFERENCIA")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="DEPOSITO">Depósito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-brand-100 px-3 py-2 text-sm font-bold text-brand-900 hover:bg-brand-200">
              Subir comprobante
              <input type="file" accept="image/*" onChange={onUploadDepositImage} className="hidden" disabled={depositBusy} />
            </label>
            <button
              onClick={onSubmitDeposit}
              disabled={depositBusy || !depositImagePath}
              className="rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {depositBusy ? "Enviando..." : "Enviar depósito"}
            </button>
          </div>
          {depositMessage && <p className="mt-2 text-xs font-semibold text-slate-700">{depositMessage}</p>}
          {workerDeposits.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Último depósito: ${workerDeposits[0].amount.toFixed(2)} ({workerDeposits[0].status})</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Muro de Ofertas (Licitación)</p>
            <button
              onClick={refreshNeeds}
              disabled={needsLoading}
              className="rounded-lg bg-brand-100 px-2 py-1 text-xs font-bold text-brand-900 disabled:opacity-60"
            >
              {needsLoading ? "..." : "Actualizar"}
            </button>
          </div>

          {!canApplyJobs && (
            <p className="mb-2 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
              <AlertTriangle size={13} />
              Saldo menor al límite, no puedes postular hasta recargar.
            </p>
          )}

          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
            {needs.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">No hay ofertas abiertas por ahora.</p>
            ) : (
              needs.slice(0, 8).map((need) => (
                <article key={need.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      placeholder="Cuánto cobrarías"
                    />
                    <input
                      value={summaryByNeed[need.id] ?? ""}
                      onChange={(event) => setSummaryByNeed((current) => ({ ...current, [need.id]: event.target.value }))}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      placeholder="Resumen de propuesta"
                    />
                    <button
                      onClick={() => onApplyNeed(need)}
                      disabled={!canApplyJobs || postingNeedId === need.id}
                      className="rounded-lg bg-brand-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {postingNeedId === need.id ? "Postulando..." : "Postular"}
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
          <p className="text-lg font-extrabold text-slate-900">Trabajos Activos</p>
          <button
            onClick={refreshOrders}
            disabled={ordersLoading}
            className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-bold text-brand-900 disabled:opacity-60"
          >
            {ordersLoading ? "Actualizando..." : "Actualizar trabajos"}
          </button>
        </div>

        {ordersError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{ordersError}</p>}

        <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {orders.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Aún no tienes órdenes asignadas.</p>
            ) : (
              orders.map((order) => (
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
                    { id: "diagnostic", label: "Diagnóstico" },
                    { id: "quotation", label: "Cotización" },
                    { id: "work-note", label: "Nota" },
                    { id: "completion", label: "Finalizar" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as "diagnostic" | "quotation" | "work-note" | "completion")}
                      className={
                        "rounded-full px-3 py-1.5 text-xs font-bold transition " +
                        (activeTab === tab.id ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                      }
                    >
                      {tab.label}
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
          <p className="text-xs text-slate-500">
            Flujo activo: lead (${policy.leadCost.toFixed(2)}) descontado al ser seleccionado. Si tu saldo cae por debajo de ${policy.trustCreditLimit.toFixed(2)}, la postulación se bloquea.
          </p>
        )}
      </article>
    </section>
  );
}
