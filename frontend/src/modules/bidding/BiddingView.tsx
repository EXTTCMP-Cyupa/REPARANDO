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
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadNeeds = async () => {
    if (!session) return;

    try {
      const items = await listServiceNeeds(role === "CLIENT" ? session.user.userId : undefined, session.accessToken);
      setNeeds(items);

      if (items.length === 0) {
        setSelectedNeedId(null);
        setBids([]);
      } else if (!selectedNeedId || !items.some((item) => item.id === selectedNeedId)) {
        setSelectedNeedId(items[0].id);
      }
    } catch {
      setNeeds([]);
      setSelectedNeedId(null);
      setMessage("No fue posible cargar necesidades.");
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
      setMessage("Propuesta seleccionada y lead cobrado.");
      await loadBidsForNeed(selectedNeedId);
    } catch {
      setMessage("No fue posible seleccionar la propuesta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <p className="badge mb-4">Escenario B: Licitacion</p>
      <div className="grid gap-3 md:grid-cols-2">
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
          <p className="font-bold">Necesidades disponibles</p>
          <p className="text-sm">Selecciona una necesidad para ver o enviar propuestas.</p>
          <div className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
            {needs.map((need) => (
              <button
                key={need.id}
                onClick={() => setSelectedNeedId(need.id)}
                className={
                  "w-full rounded-lg border px-3 py-2 text-left " +
                  (selectedNeedId === need.id ? "border-brand-700 bg-brand-100" : "border-brand-100 bg-white")
                }
              >
                <p className="font-bold">{need.title}</p>
                <p className="text-xs">{need.category}</p>
                <p className="text-xs text-brand-700">#{need.id.slice(0, 8)}</p>
              </button>
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
      </div>

      {role === "WORKER" && (
        <article className="mt-4 rounded-xl border border-brand-100 bg-white p-4">
          <p className="font-bold">Enviar propuesta</p>
          <p className="text-sm">Necesidad seleccionada: {selectedNeedId ? `#${selectedNeedId.slice(0, 8)}` : "Ninguna"}</p>
          <div className="mt-3 space-y-2 text-sm">
            <input
              value={costInput}
              onChange={(event) => setCostInput(event.target.value)}
              className="w-full rounded-lg border border-brand-200 px-3 py-2"
              placeholder="Costo mano de obra"
            />
            <textarea
              value={summaryInput}
              onChange={(event) => setSummaryInput(event.target.value)}
              className="w-full rounded-lg border border-brand-200 px-3 py-2"
              placeholder="Resumen de propuesta"
            />
          </div>
          <button
            onClick={onSubmitBid}
            disabled={busy || !selectedNeedId}
            className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Enviar propuesta
          </button>
        </article>
      )}

      {message && <p className="mt-4 rounded-lg bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">{message}</p>}

      <div className="mt-4 space-y-3">
        {bids.map((bid) => (
          <article key={bid.id} className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
            <p className="font-bold">Propuesta #{bid.id.slice(0, 8)}</p>
            <p>Worker: {bid.workerId}</p>
            <p>Costo: ${Number(bid.laborCost).toFixed(2)}</p>
            <p>Resumen: {bid.summary}</p>
            {role === "CLIENT" && (
              <button
                onClick={() => onSelectBid(bid.id)}
                disabled={busy}
                className="mt-2 rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
              >
                Seleccionar propuesta
              </button>
            )}
          </article>
        ))}
        {bids.length === 0 && (
          <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
            {selectedNeedId ? "Sin propuestas cargadas para esta necesidad." : "Selecciona una necesidad para ver propuestas."}
          </p>
        )}
      </div>
    </section>
  );
}
