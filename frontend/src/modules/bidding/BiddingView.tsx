import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listNeedBids, listServiceNeeds, publishServiceNeed, selectNeedBid, submitBidProposal } from "../../lib/api";

type BidItem = {
  id: string;
  needId: string;
  workerId: string;
  laborCost: number;
  summary: string;
  createdAt: string;
};

type NeedItem = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  status: "OPEN" | "ASSIGNED";
  selectedBidId?: string | null;
  selectedWorkerId?: string | null;
  assignedWorkOrderId?: string | null;
  assignedAt?: string | null;
};

type WorkerBidTrack = {
  needId: string;
  needTitle: string;
  bidId: string;
  laborCost: number;
  status: "EN_REVISION" | "ACEPTADA" | "RECHAZADA";
};

export function BiddingView() {
  const { session } = useAuth();
  const role = session?.user.role;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [costInput, setCostInput] = useState("");
  const [summaryInput, setSummaryInput] = useState("");

  const [bids, setBids] = useState<BidItem[]>([]);
  const [workerTracking, setWorkerTracking] = useState<WorkerBidTrack[]>([]);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedNeed = needs.find((need) => need.id === selectedNeedId) ?? null;

  const loadWorkerTracking = async (items: NeedItem[]) => {
    if (!session || role !== "WORKER") return;
    setTrackingBusy(true);

    const candidates = items.slice(0, 20);
    const result = await Promise.allSettled(candidates.map((need) => listNeedBids(need.id, session.accessToken)));
    const tracking: WorkerBidTrack[] = [];

    result.forEach((entry, index) => {
      if (entry.status !== "fulfilled") return;
      const need = candidates[index];
      entry.value
        .filter((bid) => bid.workerId === session.user.userId)
        .forEach((bid) => {
          let status: WorkerBidTrack["status"] = "EN_REVISION";
          if (need.status === "ASSIGNED") {
            status = need.selectedBidId === bid.id || need.selectedWorkerId === session.user.userId ? "ACEPTADA" : "RECHAZADA";
          }

          tracking.push({
            needId: need.id,
            needTitle: need.title,
            bidId: bid.id,
            laborCost: Number(bid.laborCost),
            status
          });
        });
    });

    setWorkerTracking(tracking);
    setTrackingBusy(false);
  };

  const loadNeeds = async () => {
    if (!session) return;

    try {
      const items = await listServiceNeeds(role === "CLIENT" ? session.user.userId : undefined, session.accessToken);
      const ordered = role === "CLIENT"
        ? [...items].sort((a, b) => (a.status === b.status ? 0 : a.status === "OPEN" ? -1 : 1))
        : items;
      setNeeds(ordered);

      if (ordered.length === 0) {
        setSelectedNeedId(null);
        setBids([]);
      } else if (!selectedNeedId || !ordered.some((item) => item.id === selectedNeedId)) {
        setSelectedNeedId(ordered[0].id);
      }

      if (role === "WORKER") {
        await loadWorkerTracking(ordered);
      }
    } catch {
      setNeeds([]);
      setSelectedNeedId(null);
      setMessage("No fue posible cargar necesidades.");
      if (role === "WORKER") {
        setWorkerTracking([]);
      }
    }
  };

  const loadBidsForNeed = async (needId: string) => {
    if (!session) return;
    try {
      setBusy(true);
      const items = await listNeedBids(needId, session.accessToken);
      setBids(items);
    } catch {
      setBids([]);
      setMessage("No fue posible cargar propuestas.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadNeeds();
  }, [session, role]);

  useEffect(() => {
    if (selectedNeedId) {
      loadBidsForNeed(selectedNeedId);
    }
  }, [selectedNeedId]);

  const onPublishNeed = async () => {
    if (!session) return;
    if (role !== "CLIENT") {
      setMessage("Solo clientes pueden publicar necesidades.");
      return;
    }

    if (!title.trim() || !description.trim() || !category.trim()) {
      setMessage("Completa titulo, descripcion y categoria para publicar.");
      return;
    }

    try {
      setBusy(true);
      const created = await publishServiceNeed(
        {
          clientId: session.user.userId,
          title: title.trim(),
          description: description.trim(),
          category: category.trim()
        },
        session.accessToken
      );
      setSelectedNeedId(created.id);
      setTitle("");
      setDescription("");
      setCategory("");
      await loadNeeds();
      setMessage(`Necesidad publicada: ${created.id}`);
    } catch {
      setMessage("No fue posible publicar la necesidad.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmitBid = async () => {
    if (!session || !selectedNeedId) return;
    if (role !== "WORKER") {
      setMessage("Solo trabajadores pueden enviar propuestas.");
      return;
    }

    const laborCost = Number(costInput);
    if (!Number.isFinite(laborCost) || laborCost <= 0 || !summaryInput.trim()) {
      setMessage("Ingresa un costo valido y un resumen para enviar la propuesta.");
      return;
    }

    try {
      setBusy(true);
      await submitBidProposal(
        {
          needId: selectedNeedId,
          workerId: session.user.userId,
          laborCost,
          summary: summaryInput.trim()
        },
        session.accessToken
      );
      setCostInput("");
      setSummaryInput("");
      await loadBidsForNeed(selectedNeedId);
      await loadNeeds();
      setMessage("Propuesta enviada correctamente.");
    } catch {
      setMessage("No fue posible enviar la propuesta.");
    } finally {
      setBusy(false);
    }
  };

  const onSelectBid = async (bidId: string) => {
    if (!session || role !== "CLIENT" || !selectedNeedId) return;

    try {
      setBusy(true);
      await selectNeedBid(selectedNeedId, bidId, session.user.userId, session.accessToken);
      setMessage("Propuesta seleccionada. El trabajo fue asignado y ya no aparecerá para otros técnicos.");
      await loadNeeds();
      await loadBidsForNeed(selectedNeedId);
    } catch {
      setMessage("No fue posible seleccionar la propuesta.");
    } finally {
      setBusy(false);
    }
  };

  const workerBidOnSelected = role === "WORKER" && bids.some((bid) => bid.workerId === session?.user.userId);

  const selectedWorkerStatus = (() => {
    if (role !== "WORKER" || !selectedNeed || !workerBidOnSelected || !session) return null;
    const myBid = bids.find((bid) => bid.workerId === session.user.userId);
    if (!myBid) return null;
    if (selectedNeed.status === "ASSIGNED") {
      return selectedNeed.selectedBidId === myBid.id || selectedNeed.selectedWorkerId === session.user.userId
        ? "Aceptada"
        : "Rechazada";
    }
    return "Pendiente de aceptación";
  })();

  const selectedNeedDaysRemaining = selectedNeed
    ? Math.max(0, 3 - Math.floor((Date.now() - new Date(selectedNeed.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <section className="card">
      <p className="badge mb-4">Escenario B: Licitacion</p>
      <div className={"grid gap-3 " + (role === "WORKER" ? "lg:grid-cols-[1.1fr_1fr]" : "md:grid-cols-2")}>
        {role === "CLIENT" && (
          <div className="rounded-xl border border-brand-100 bg-white p-4">
            <p className="font-bold">Publicar necesidad</p>
            <p className="text-sm">Describe el trabajo para recibir propuestas reales.</p>
            <div className="mt-3 space-y-2 text-sm">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Ej: Reparar fuga en cocina"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Describe el alcance, urgencia y detalles"
              />
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Ej: PLOMERO"
              />
            </div>
            <button
              onClick={onPublishNeed}
              disabled={busy || !title.trim() || !description.trim() || !category.trim()}
              className="mt-3 rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Publicar necesidad
            </button>
          </div>
        )}

        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="font-bold">Muro de Necesidades Abiertas</p>
          <p className="text-sm">Selecciona una necesidad para ver detalles y ofertar.</p>
          <div className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
            {needs.map((need) => (
              <article
                key={need.id}
                className={
                  "rounded-lg border px-3 py-2 text-left " +
                  (selectedNeedId === need.id ? "border-brand-700 bg-brand-100" : "border-brand-100 bg-white")
                }
              >
                <p className="font-bold">{need.title}</p>
                <p className="text-xs">{need.category}</p>
                <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${need.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-900"}`}>
                  {need.status === "OPEN" ? "Abierta" : "Asignada"}
                </p>
                <p className="text-xs text-brand-700">#{need.id.slice(0, 8)}</p>
                <button
                  onClick={() => setSelectedNeedId(need.id)}
                  className="mt-2 w-full rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900 hover:bg-brand-100"
                >
                  Ver detalles y ofertar
                </button>
              </article>
            ))}
            {needs.length === 0 && (
              <p className="rounded-lg border border-brand-100 bg-white px-3 py-2">
                {role === "CLIENT"
                  ? "Aun no publicaste necesidades. Usa el formulario para crear la primera."
                  : "No hay necesidades activas por el momento."
                }
              </p>
            )}
          </div>
        </div>

        {role === "WORKER" && (
          <article className="rounded-xl border border-brand-100 bg-white p-4">
            <p className="font-bold">
              Enviar propuesta para: {selectedNeed ? selectedNeed.title : "Selecciona una necesidad"}
            </p>
            {selectedNeed && (
              <>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">Descripción:</span> {selectedNeed.description}
                </p>
                <p className="mt-1 text-xs text-slate-600">Estado: {selectedNeed.status === "OPEN" ? `Abierta · ${selectedNeedDaysRemaining} días restantes` : "Asignada"}</p>
              </>
            )}
            {selectedWorkerStatus && (
              <p className={
                "mt-2 rounded-lg px-3 py-2 text-xs font-semibold " +
                (selectedWorkerStatus === "Pendiente de aceptación"
                  ? "bg-amber-100 text-amber-800"
                  : selectedWorkerStatus === "Aceptada"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700")
              }>
                Estado de tu propuesta: {selectedWorkerStatus}
              </p>
            )}

            <div className="mt-3 space-y-2 text-sm">
              <input
                value={costInput}
                onChange={(event) => setCostInput(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Mano de obra ($)"
                disabled={!selectedNeed || workerBidOnSelected || selectedNeed.status !== "OPEN"}
              />
              <textarea
                value={summaryInput}
                onChange={(event) => setSummaryInput(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Resumen de propuesta / metodología"
                disabled={!selectedNeed || workerBidOnSelected || selectedNeed.status !== "OPEN"}
              />
            </div>
            <button
              onClick={onSubmitBid}
              disabled={busy || !selectedNeedId || selectedNeed?.status !== "OPEN" || workerBidOnSelected}
              className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Enviando..." : workerBidOnSelected ? "Pendiente de aceptación" : "Enviar propuesta"}
            </button>

            <div className="mt-4 border-t border-brand-100 pt-3">
              <p className="font-bold">Seguimiento de mis propuestas</p>
              {trackingBusy ? (
                <p className="mt-2 text-xs text-slate-600">Actualizando seguimiento...</p>
              ) : workerTracking.length === 0 ? (
                <p className="mt-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">
                  Aún no has enviado propuestas.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {workerTracking.slice(0, 8).map((track) => (
                    <article key={track.bidId} className="rounded-lg border border-brand-100 bg-brand-50 p-2 text-xs">
                      <p className="font-bold">{track.needTitle}</p>
                      <p>ID: #{track.bidId.slice(0, 8)}</p>
                      <p>Costo: ${Number(track.laborCost).toFixed(2)}</p>
                      <p
                        className={
                          "mt-1 inline-block rounded-full px-2 py-0.5 font-bold " +
                          (track.status === "EN_REVISION"
                            ? "bg-amber-100 text-amber-800"
                            : track.status === "ACEPTADA"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700")
                        }
                      >
                        {track.status === "EN_REVISION" ? "En revisión" : track.status === "ACEPTADA" ? "Aceptada" : "Rechazada"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </article>
        )}
      </div>

      {message && <p className="mt-4 rounded-lg bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">{message}</p>}

      {role === "CLIENT" && <div className="mt-4 space-y-3">
        {bids.map((bid) => (
          <article key={bid.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
            <p className="font-bold">Propuesta #{bid.id.slice(0, 8)}</p>
            <p>Worker: {bid.workerId}</p>
            <p>Costo: ${Number(bid.laborCost).toFixed(2)}</p>
            <p>Resumen: {bid.summary}</p>
            {role === "CLIENT" && selectedNeed?.status === "OPEN" && (
              <button
                onClick={() => onSelectBid(bid.id)}
                disabled={busy}
                className="mt-2 rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
              >
                Seleccionar propuesta
              </button>
            )}
            {role === "CLIENT" && selectedNeed?.status === "ASSIGNED" && selectedNeed.selectedBidId === bid.id && (
              <p className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Propuesta asignada</p>
            )}
          </article>
        ))}
        {bids.length === 0 && (
          <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
            {selectedNeedId ? "Sin propuestas cargadas para esta necesidad." : "Selecciona una necesidad para ver propuestas."}
          </p>
        )}
      </div>}
    </section>
  );
}
