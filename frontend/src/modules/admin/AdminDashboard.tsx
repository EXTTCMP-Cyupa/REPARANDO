import { Check, CircleX, RefreshCcw, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  approveDeposit,
  createLedgerAdjustment,
  getBusinessPolicy,
  getPendingDeposits,
  getWorkerLedger,
  refundLedgerEntry,
  rejectDeposit,
  updateBusinessPolicy
} from "../../lib/api";
import { Toast, type ToastMessage } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";

export function AdminDashboard() {
  const { session } = useAuth();
  const ledgerSectionRef = useRef<HTMLElement | null>(null);
  const [deposits, setDeposits] = useState<
    Array<{
      id: string;
      workerName: string;
      amount: number;
      paymentMethod: "DEPOSITO" | "TRANSFERENCIA";
      imagePath: string;
      status: "PENDING";
    }>
  >([]);
  const [policy, setPolicy] = useState({ leadCost: 1.5, trustCreditLimit: -3 });
  const [leadCostInput, setLeadCostInput] = useState("1.50");
  const [trustLimitInput, setTrustLimitInput] = useState("-3.00");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [ledgerWorkerId, setLedgerWorkerId] = useState("11111111-1111-1111-1111-111111111111");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerBusyId, setLedgerBusyId] = useState<string | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<
    Array<{
      id: string;
      workerId: string;
      entryType: "LEAD_CHARGE" | "DEPOSIT_APPROVED" | "REFUND" | "ADJUSTMENT_CREDIT" | "ADJUSTMENT_DEBIT";
      amount: number;
      description: string;
      referenceEntryId?: string | null;
      externalReference?: string | null;
      createdAt: string;
      createdBy: string;
    }>
  >([]);
  const [adjustAmount, setAdjustAmount] = useState("0.50");
  const [adjustReason, setAdjustReason] = useState("Ajuste administrativo");
  const [creatingAdjustment, setCreatingAdjustment] = useState(false);

  const pushToast = (type: "success" | "error", text: string) => {
    setToasts((current) => [
      ...current,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type,
        text
      }
    ]);
  };

  const removeToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const loadData = () => {
    if (!session) return;

    getBusinessPolicy(session.accessToken)
      .then((value) => {
        const parsed = { leadCost: Number(value.leadCost), trustCreditLimit: Number(value.trustCreditLimit) };
        setPolicy(parsed);
        setLeadCostInput(parsed.leadCost.toFixed(2));
        setTrustLimitInput(parsed.trustCreditLimit.toFixed(2));
      })
      .catch(() => {
        setPolicy({ leadCost: 1.5, trustCreditLimit: -3 });
        setLeadCostInput("1.50");
        setTrustLimitInput("-3.00");
      });

    getPendingDeposits(session.accessToken)
      .then((items) =>
        setDeposits(
          items.map((item) => ({
            id: item.id,
            workerName: item.workerId,
            amount: item.amount,
            paymentMethod: item.paymentMethod,
            imagePath: item.imagePath,
            status: "PENDING" as const
          }))
        )
      )
      .catch(() => {
        setDeposits([]);
        pushToast("error", "No fue posible cargar depósitos pendientes.");
      });
  };

  useEffect(() => {
    loadData();
    loadLedger();
  }, [session]);

  const loadLedger = async () => {
    if (!session) return;
    if (!ledgerWorkerId.trim()) {
      pushToast("error", "Ingresa un workerId para consultar el ledger.");
      return;
    }

    try {
      setLedgerLoading(true);
      const entries = await getWorkerLedger(ledgerWorkerId.trim(), session.accessToken);
      setLedgerEntries(entries);
    } catch {
      setLedgerEntries([]);
      pushToast("error", "No fue posible cargar el ledger del trabajador.");
    } finally {
      setLedgerLoading(false);
    }
  };

  const onApprove = async (depositId: string) => {
    if (!session) return;
    const adminId = session.user.userId;

    try {
      setBusyId(depositId);
      await approveDeposit(depositId, adminId, session.accessToken);
      setDeposits((current) => current.filter((item) => item.id !== depositId));
      pushToast("success", "Depósito aprobado correctamente.");
    } catch {
      loadData();
      pushToast("error", "No fue posible aprobar el depósito.");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (depositId: string) => {
    if (!session) return;
    const adminId = session.user.userId;

    try {
      setBusyId(depositId);
      await rejectDeposit(depositId, adminId, session.accessToken);
      setDeposits((current) => current.filter((item) => item.id !== depositId));
      pushToast("success", "Depósito rechazado correctamente.");
    } catch {
      loadData();
      pushToast("error", "No fue posible rechazar el depósito.");
    } finally {
      setBusyId(null);
    }
  };

  const onSavePolicy = async () => {
    if (!session) return;

    const leadCost = Number(leadCostInput);
    const trustCreditLimit = Number(trustLimitInput);

    if (!Number.isFinite(leadCost) || leadCost <= 0) {
      pushToast("error", "Lead cost debe ser mayor a cero.");
      return;
    }
    if (!Number.isFinite(trustCreditLimit) || trustCreditLimit > 0) {
      pushToast("error", "El límite de crédito debe ser cero o negativo.");
      return;
    }

    try {
      setSavingPolicy(true);
      const updated = await updateBusinessPolicy(leadCost, trustCreditLimit, session.accessToken);
      setPolicy({ leadCost: Number(updated.leadCost), trustCreditLimit: Number(updated.trustCreditLimit) });
      pushToast("success", "Parámetros guardados correctamente.");
    } catch {
      pushToast("error", "No fue posible guardar parámetros.");
    } finally {
      setSavingPolicy(false);
    }
  };

  const onCreateAdjustment = async () => {
    if (!session) return;
    const amount = Number(adjustAmount);

    if (!ledgerWorkerId.trim()) {
      pushToast("error", "Ingresa un workerId para crear el ajuste.");
      return;
    }
    if (!Number.isFinite(amount) || amount === 0) {
      pushToast("error", "El monto del ajuste debe ser distinto de cero.");
      return;
    }
    if (!adjustReason.trim()) {
      pushToast("error", "El motivo del ajuste es obligatorio.");
      return;
    }

    try {
      setCreatingAdjustment(true);
      await createLedgerAdjustment(
        {
          workerId: ledgerWorkerId.trim(),
          amount,
          reason: adjustReason.trim(),
          adminId: session.user.userId
        },
        session.accessToken
      );
      pushToast("success", "Ajuste registrado correctamente.");
      await loadLedger();
    } catch {
      pushToast("error", "No fue posible registrar el ajuste.");
    } finally {
      setCreatingAdjustment(false);
    }
  };

  const onRefund = async (entryId: string) => {
    if (!session) return;

    try {
      setLedgerBusyId(entryId);
      await refundLedgerEntry(
        entryId,
        {
          reason: "Refund emitido desde panel admin",
          adminId: session.user.userId
        },
        session.accessToken
      );
      pushToast("success", "Refund registrado correctamente.");
      await loadLedger();
    } catch {
      pushToast("error", "No fue posible crear el refund para ese asiento.");
    } finally {
      setLedgerBusyId(null);
    }
  };

  const ledgerTypeLabel = (type: string) => {
    switch (type) {
      case "LEAD_CHARGE":
        return "Cargo lead";
      case "DEPOSIT_APPROVED":
        return "Depósito aprobado";
      case "REFUND":
        return "Refund";
      case "ADJUSTMENT_CREDIT":
        return "Ajuste crédito";
      case "ADJUSTMENT_DEBIT":
        return "Ajuste débito";
      default:
        return type;
    }
  };

  return (
    <section className="space-y-6">
      <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
        Panel Admin actualizado: módulo Ledger activo (ajustes y refunds).
      </article>

      <article className="card">
        <div className="mb-4 flex items-center justify-between">
          <p className="badge">Aprobación de Depósitos</p>
          <div className="rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50">
            Lead: ${policy.leadCost.toFixed(2)} | Límite: ${policy.trustCreditLimit.toFixed(2)}
          </div>
        </div>

        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          Marca de versión UI: LEDGER-ADMIN-2026-03-31
        </p>

        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">¿No ves el módulo Ledger? Está debajo de este bloque.</p>
          <button
            onClick={() => ledgerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="mt-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
          >
            Ir al Ledger Financiero
          </button>
        </div>

        <div className="mb-4 grid gap-2 rounded-xl border border-brand-100 bg-white p-3 md:grid-cols-4">
          <input
            value={leadCostInput}
            onChange={(e) => setLeadCostInput(e.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="Lead cost"
          />
          <input
            value={trustLimitInput}
            onChange={(e) => setTrustLimitInput(e.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="Trust credit limit"
          />
          <button
            onClick={onSavePolicy}
            disabled={savingPolicy}
            className="rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
          >
            Guardar parámetros
          </button>
        </div>

        <div className="space-y-3">
          {deposits.length === 0 && (
            <article className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
              No hay depósitos pendientes en este momento.
            </article>
          )}
          {deposits.map((deposit) => (
            <article key={deposit.id} className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="font-bold">{deposit.workerName}</p>
              <p className="text-sm">Monto: ${deposit.amount.toFixed(2)}</p>
              <p className="text-sm">Medio: {deposit.paymentMethod}</p>
              <p className="text-sm">Comprobante: {deposit.imagePath}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onApprove(deposit.id)}
                  disabled={busyId === deposit.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={16} /> Aprobar
                </button>
                <button
                  onClick={() => onReject(deposit.id)}
                  disabled={busyId === deposit.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CircleX size={16} /> Rechazar
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article ref={ledgerSectionRef} className="card">
        <div className="mb-4 flex items-center justify-between">
          <p className="badge">Ledger Financiero</p>
          <button
            onClick={loadLedger}
            disabled={ledgerLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
          >
            <RefreshCcw size={14} /> Recargar
          </button>
        </div>

        <div className="mb-4 grid gap-2 rounded-xl border border-brand-100 bg-white p-3 md:grid-cols-3">
          <input
            value={ledgerWorkerId}
            onChange={(event) => setLedgerWorkerId(event.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="Worker ID"
          />
          <input
            value={adjustAmount}
            onChange={(event) => setAdjustAmount(event.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="Monto ajuste (+/-)"
          />
          <input
            value={adjustReason}
            onChange={(event) => setAdjustReason(event.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="Motivo ajuste"
          />
          <button
            onClick={onCreateAdjustment}
            disabled={creatingAdjustment}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60 md:col-span-3"
          >
            Crear ajuste
          </button>
        </div>

        <div className="space-y-2">
          {ledgerEntries.length === 0 && (
            <article className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
              No hay movimientos para este trabajador o aún no se cargó el ledger.
            </article>
          )}
          {ledgerEntries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-brand-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{ledgerTypeLabel(entry.entryType)}</p>
                  <p className="text-xs text-slate-600">{entry.description}</p>
                  <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <p className={"text-sm font-extrabold " + (entry.amount >= 0 ? "text-emerald-700" : "text-red-700")}>
                  {entry.amount >= 0 ? "+" : ""}${Number(entry.amount).toFixed(2)}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-600">ID: {entry.id}</p>
              {entry.referenceEntryId && <p className="text-xs text-slate-600">Ref: {entry.referenceEntryId}</p>}

              {entry.entryType !== "REFUND" && (
                <button
                  onClick={() => onRefund(entry.id)}
                  disabled={ledgerBusyId === entry.id}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  <Undo2 size={14} /> Refund
                </button>
              )}
            </article>
          ))}
        </div>
      </article>

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[340px] max-w-[90vw] flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </section>
  );
}
