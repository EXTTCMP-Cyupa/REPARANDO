import { Check, CircleX } from "lucide-react";
import { useEffect, useState } from "react";
import { approveDeposit, getBusinessPolicy, getPendingDeposits, rejectDeposit, updateBusinessPolicy } from "../../lib/api";
import { Toast, type ToastMessage } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";

export function AdminDashboard() {
  const { session } = useAuth();
  const [deposits, setDeposits] = useState<Array<{ id: string; workerName: string; amount: number; imagePath: string; status: "PENDING" }>>([]);
  const [policy, setPolicy] = useState({ leadCost: 1.5, trustCreditLimit: -3 });
  const [leadCostInput, setLeadCostInput] = useState("1.50");
  const [trustLimitInput, setTrustLimitInput] = useState("-3.00");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
  }, [session]);

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

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <p className="badge">Aprobación de Depósitos</p>
        <div className="rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50">
          Lead: ${policy.leadCost.toFixed(2)} | Límite: ${policy.trustCreditLimit.toFixed(2)}
        </div>
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

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[340px] max-w-[90vw] flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
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
    </section>
  );
}
