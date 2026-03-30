import { CircleDollarSign, PackagePlus, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addWorkOrderMaterial,
  getBusinessPolicy,
  getWorkerAccount,
  getWorkerWorkOrders,
  listWorkOrderMaterials,
  moveWorkOrderStatus
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type WorkerWorkOrder = {
  id: string;
  clientId: string;
  workerId: string;
  status: string;
};

type WorkMaterial = {
  id: string;
  workOrderId: string;
  workerId: string;
  name: string;
  quantity: number;
  unitCost: number;
  createdAt: string;
};

const NEXT_STATUS: Record<string, string | null> = {
  DIAGNOSTICO: "COTIZADO",
  COTIZADO: "EN_PROCESO",
  EN_PROCESO: "FINALIZADO",
  FINALIZADO: null
};

export function WorkerDashboard() {
  const { session } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [policy, setPolicy] = useState({ leadCost: 1.5, trustCreditLimit: -3 });
  const [orders, setOrders] = useState<WorkerWorkOrder[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [materialsByOrder, setMaterialsByOrder] = useState<Record<string, WorkMaterial[]>>({});
  const [materialsBusy, setMaterialsBusy] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [materialQty, setMaterialQty] = useState("1");
  const [materialUnitCost, setMaterialUnitCost] = useState("");
  const [materialMessage, setMaterialMessage] = useState<string | null>(null);

  const refreshAccount = () => {
    if (!session) return;
    setAccountError(null);
    getWorkerAccount(session.user.userId, session.accessToken)
      .then((account) => {
        setBalance(account.balance);
        setBlocked(account.blocked);
      })
      .catch(() => {
        setBalance(null);
        setBlocked(null);
        setAccountError("No fue posible cargar el saldo actual.");
      });
  };

  const refreshOrders = () => {
    if (!session) return;
    setOrdersError(null);

    getWorkerWorkOrders(session.user.userId, session.accessToken)
      .then((items) => setOrders(items))
      .catch(() => {
        setOrders([]);
        setOrdersError("No fue posible cargar tus órdenes.");
      });
  };

  const loadMaterials = async (workOrderId: string) => {
    if (!session) return;
    try {
      setMaterialsBusy(true);
      setMaterialsError(null);
      const items = await listWorkOrderMaterials(workOrderId, session.accessToken);
      setMaterialsByOrder((current) => ({ ...current, [workOrderId]: items }));
    } catch {
      setMaterialsByOrder((current) => ({ ...current, [workOrderId]: [] }));
      setMaterialsError("No fue posible cargar materiales de la orden.");
    } finally {
      setMaterialsBusy(false);
    }
  };

  const onSelectOrderForMaterials = async (workOrderId: string) => {
    setSelectedOrderId(workOrderId);
    setMaterialMessage(null);
    if (!materialsByOrder[workOrderId]) {
      await loadMaterials(workOrderId);
    }
  };

  const onAddMaterial = async () => {
    if (!session || !selectedOrderId) return;

    const quantity = Number(materialQty);
    const unitCost = Number(materialUnitCost);

    if (!materialName.trim()) {
      setMaterialMessage("Ingresa el nombre del material.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMaterialMessage("Cantidad debe ser mayor a 0.");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      setMaterialMessage("Costo unitario debe ser mayor a 0.");
      return;
    }

    try {
      setMaterialsBusy(true);
      setMaterialMessage(null);
      await addWorkOrderMaterial(
        selectedOrderId,
        {
          workerId: session.user.userId,
          name: materialName.trim(),
          quantity,
          unitCost
        },
        session.accessToken
      );
      setMaterialName("");
      setMaterialQty("1");
      setMaterialUnitCost("");
      await loadMaterials(selectedOrderId);
      setMaterialMessage("Material registrado correctamente.");
    } catch {
      setMaterialMessage("No fue posible registrar el material.");
    } finally {
      setMaterialsBusy(false);
    }
  };

  const onAdvanceStatus = async (order: WorkerWorkOrder) => {
    if (!session) return;
    const next = NEXT_STATUS[order.status] ?? null;
    if (!next) return;

    try {
      setUpdatingId(order.id);
      setStatusMessage(null);
      await moveWorkOrderStatus(order.id, next, session.accessToken);
      refreshOrders();
      setStatusMessage(`Orden ${order.id.slice(0, 8)} actualizada a ${next}.`);
    } catch {
      setStatusMessage("No fue posible avanzar el estado. Intenta de nuevo.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    if (!session) return;

    refreshAccount();
    getBusinessPolicy(session.accessToken)
      .then((value) => {
        setPolicy({
          leadCost: Number(value.leadCost),
          trustCreditLimit: Number(value.trustCreditLimit)
        });
      })
      .catch(() => setPolicy({ leadCost: 1.5, trustCreditLimit: -3 }));

    refreshOrders();
    setSelectedOrderId(null);
    setMaterialsByOrder({});

    const interval = window.setInterval(() => {
      refreshAccount();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [session]);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="card md:col-span-1">
        <p className="badge mb-3">Saldo</p>
        <h2 className="flex items-center gap-2 text-3xl font-extrabold">
          <CircleDollarSign className="text-brand-700" /> {balance === null ? "--" : `$${balance.toFixed(2)}`}
        </h2>
        <p className="mt-2 text-sm">
          Límite de confianza: ${policy.trustCreditLimit.toFixed(2)}. Costo por lead: ${policy.leadCost.toFixed(2)}.
        </p>
        <button onClick={refreshAccount} className="mt-2 rounded-lg bg-brand-100 px-3 py-2 text-xs font-bold text-brand-900">
          Actualizar saldo
        </button>
        {blocked ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">
            <ShieldAlert size={16} /> Bloqueado hasta aprobación de depósito
          </p>
        ) : blocked === false ? (
          <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">Cuenta habilitada</p>
        ) : (
          <p className="mt-3 rounded-xl bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">Estado de cuenta no disponible</p>
        )}
        {accountError && <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{accountError}</p>}
      </article>

      <article className="card md:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <p className="badge">Trabajos Activos</p>
          <p className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-bold text-brand-900">Selecciona una orden para gestionar materiales</p>
        </div>
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-700">
              No hay órdenes registradas para este trabajador.
            </p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-brand-100 bg-white p-4">
                <p className="font-bold">Orden #{order.id.slice(0, 8)}</p>
                <p className="text-sm">Estado: {order.status}</p>
                <p className="text-sm">Cliente: {order.clientId}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onAdvanceStatus(order)}
                    disabled={updatingId === order.id || !NEXT_STATUS[order.status]}
                    className="rounded-lg bg-brand-900 px-3 py-2 text-xs font-bold text-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {NEXT_STATUS[order.status] ? `Avanzar a ${NEXT_STATUS[order.status]}` : "Orden finalizada"}
                  </button>
                  <button
                    onClick={() => onSelectOrderForMaterials(order.id)}
                    className={
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold " +
                      (selectedOrderId === order.id
                        ? "bg-brand-500 text-brand-900"
                        : "bg-brand-100 text-brand-900 hover:bg-brand-300")
                    }
                  >
                    <PackagePlus size={14} /> {selectedOrderId === order.id ? "Orden seleccionada" : "Añadir materiales"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {selectedOrderId && (
          <div className="mt-4 rounded-xl border border-brand-100 bg-white p-4">
            <p className="font-bold">Materiales de la orden #{selectedOrderId.slice(0, 8)}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <input
                value={materialName}
                onChange={(event) => setMaterialName(event.target.value)}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="Material"
              />
              <input
                value={materialQty}
                onChange={(event) => setMaterialQty(event.target.value)}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="Cantidad"
              />
              <input
                value={materialUnitCost}
                onChange={(event) => setMaterialUnitCost(event.target.value)}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="Costo unitario"
              />
              <button
                onClick={onAddMaterial}
                disabled={materialsBusy}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar material
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {(materialsByOrder[selectedOrderId] ?? []).map((material) => (
                <div key={material.id} className="rounded-lg border border-brand-100 px-3 py-2 text-sm">
                  <p className="font-semibold">{material.name}</p>
                  <p>Cantidad: {material.quantity} | Unitario: ${Number(material.unitCost).toFixed(2)}</p>
                </div>
              ))}
              {!materialsBusy && (materialsByOrder[selectedOrderId] ?? []).length === 0 && (
                <p className="rounded-lg border border-brand-100 px-3 py-2 text-sm">Sin materiales registrados.</p>
              )}
            </div>
            {materialsError && <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{materialsError}</p>}
            {materialMessage && <p className="mt-3 rounded-lg bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">{materialMessage}</p>}
          </div>
        )}
        {statusMessage && <p className="mt-3 rounded-lg bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">{statusMessage}</p>}
        {ordersError && <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{ordersError}</p>}
      </article>
    </section>
  );
}
