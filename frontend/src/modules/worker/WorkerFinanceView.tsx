import { CircleDollarSign } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getBusinessPolicy,
  getWorkerAccount,
  getWorkerDeposits,
  getWorkerWorkOrders,
  submitDepositReceipt,
  uploadDepositReceiptImage
} from "../../lib/api";

type WorkerWorkOrder = {
  id: string;
  status: "DIAGNOSTICO" | "COTIZADO" | "EN_PROCESO" | "FINALIZADO";
  quotationLaborCost?: number | null;
  quotationMaterialsCost?: number | null;
  workNotes?: Array<{
    additionalCost: number;
    clientApproved: boolean | null;
  }>;
};

export function WorkerFinanceView() {
  const { session } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [policy, setPolicy] = useState({ leadCost: 1.5, trustCreditLimit: -3 });
  const [orders, setOrders] = useState<WorkerWorkOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [depositAmount, setDepositAmount] = useState("");
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<"DEPOSITO" | "TRANSFERENCIA">("DEPOSITO");
  const [depositImagePath, setDepositImagePath] = useState<string | null>(null);
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMessage, setDepositMessage] = useState<string | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [workerDeposits, setWorkerDeposits] = useState<
    Array<{
      id: string;
      amount: number;
      paymentMethod: "DEPOSITO" | "TRANSFERENCIA";
      status: "APPROVED" | "PENDING" | "REJECTED";
      createdAt: string;
    }>
  >([]);

  const refreshFinance = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!session) return;
    if (!silent) {
      setLoading(true);
    }

    const [accountResult, policyResult, ordersResult, depositsResult] = await Promise.allSettled([
      getWorkerAccount(session.user.userId, session.accessToken),
      getBusinessPolicy(session.accessToken),
      getWorkerWorkOrders(session.user.userId, session.accessToken),
      getWorkerDeposits(session.user.userId, session.accessToken)
    ]);

    let failedCriticalCalls = 0;

    if (accountResult.status === "fulfilled") {
      setBalance(accountResult.value.balance);
    } else {
      setBalance(null);
      failedCriticalCalls += 1;
    }

    if (policyResult.status === "fulfilled") {
      setPolicy({
        leadCost: Number(policyResult.value.leadCost),
        trustCreditLimit: Number(policyResult.value.trustCreditLimit)
      });
    } else {
      // Keep fallback policy values if endpoint is not available for this role.
      setPolicy({ leadCost: 1.5, trustCreditLimit: -3 });
    }

    if (ordersResult.status === "fulfilled") {
      setOrders(ordersResult.value as WorkerWorkOrder[]);
    } else {
      setOrders([]);
      failedCriticalCalls += 1;
    }

    if (depositsResult.status === "fulfilled") {
      setWorkerDeposits(
        depositsResult.value.map((item) => ({
          id: item.id,
          amount: Number(item.amount),
          paymentMethod: item.paymentMethod,
          status: item.status,
          createdAt: item.createdAt
        }))
      );
    } else {
      setWorkerDeposits([]);
      failedCriticalCalls += 1;
    }

    if (failedCriticalCalls > 0) {
      setLoadMessage("Algunos datos financieros no se pudieron cargar. Intenta actualizar nuevamente.");
    } else {
      setLoadMessage(null);
    }

    if (!silent) {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    refreshFinance({ silent: false });

    const interval = window.setInterval(() => {
      refreshFinance({ silent: true });
    }, 9000);

    return () => window.clearInterval(interval);
  }, [session]);

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
      refreshFinance();
    } catch {
      setDepositMessage("No fue posible registrar el depósito.");
    } finally {
      setDepositBusy(false);
    }
  };

  const inProcessOrders = useMemo(() => orders.filter((order) => order.status === "EN_PROCESO"), [orders]);
  const pendingApprovalOrders = useMemo(
    () => orders.filter((order) => order.status === "COTIZADO" || (order.status === "DIAGNOSTICO" && !!order.quotationLaborCost)),
    [orders]
  );
  const finalizedOrders = useMemo(() => orders.filter((order) => order.status === "FINALIZADO"), [orders]);

  const totalRevenue = useMemo(() => {
    return finalizedOrders.reduce((total, order) => {
      const quotation = Number(order.quotationLaborCost ?? 0) + Number(order.quotationMaterialsCost ?? 0);
      const approvedExtras = (order.workNotes ?? []).reduce((noteSum, note) => {
        if (note.clientApproved === true) return noteSum + Number(note.additionalCost ?? 0);
        return noteSum;
      }, 0);
      return total + quotation + approvedExtras;
    }, 0);
  }, [finalizedOrders]);

  const availableCredits = useMemo(() => {
    if (balance === null || policy.leadCost <= 0) return 0;
    const raw = Math.floor((balance - policy.trustCreditLimit) / policy.leadCost);
    return Math.max(0, raw);
  }, [balance, policy.leadCost, policy.trustCreditLimit]);

  const lowCredits = availableCredits <= 2;

  return (
    <section className="grid gap-4">
      <article className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-lg font-extrabold text-slate-900">Finanzas del Trabajador</p>
            <p className="text-xs text-slate-600">Controla depósitos, créditos y rendimiento económico.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshFinance({ silent: false })}
              disabled={loading}
              className="rounded-lg bg-brand-100 px-3 py-1 text-xs font-bold text-brand-900 disabled:opacity-60"
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              <CircleDollarSign size={14} />
              Balance: {balance === null ? "--" : `$ ${balance.toFixed(2)}`}
            </span>
            <span className={"inline-flex items-center rounded-full px-3 py-1 text-xs font-bold " + (lowCredits ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-900")}>
              Créditos aprox: {availableCredits}
            </span>
          </div>
        </div>
        {loading && <p className="mt-2 text-xs text-slate-500">Actualizando datos financieros...</p>}
        {loadMessage && <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">{loadMessage}</p>}
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Trabajos Totales</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{orders.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">En Proceso</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-900">{inProcessOrders.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">En Aprobación</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{pendingApprovalOrders.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Finalizados</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{finalizedOrders.length}</p>
        </article>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Movimientos y Rendimiento</p>
            <p className="text-xs font-semibold text-slate-500">Lead por trabajo: ${policy.leadCost.toFixed(2)}</p>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Ingresos Estimados</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-700">$ {totalRevenue.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Créditos Disponibles</p>
              <p className={"mt-1 text-2xl font-extrabold " + (lowCredits ? "text-amber-700" : "text-brand-900")}>{availableCredits}</p>
              <p className="text-xs text-slate-500">Antes de llegar al límite de ${policy.trustCreditLimit.toFixed(2)}</p>
            </div>
          </div>

          {lowCredits && (
            <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
              Te estás quedando con pocos créditos. Sube un depósito para seguir tomando trabajos.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900">Historial de Depósitos</p>
            {workerDeposits.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Aún no tienes depósitos registrados.
              </p>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
                {workerDeposits.map((deposit) => (
                  <article key={deposit.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">$ {deposit.amount.toFixed(2)}</p>
                      <span
                        className={
                          "rounded-full px-2 py-1 text-[11px] font-bold " +
                          (deposit.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : deposit.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800")
                        }
                      >
                        {deposit.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">Método: {deposit.paymentMethod}</p>
                    <p className="text-xs text-slate-500">Fecha: {new Date(deposit.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-900">Subir Comprobante de Depósito</p>
          <p className="mt-1 text-xs text-slate-600">Recarga créditos para seguir tomando trabajos.</p>
          <div className="mt-3 grid gap-2">
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
        </article>
      </div>
    </section>
  );
}
