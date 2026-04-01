import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listNeedBids, listServiceNeeds, publishServiceNeed, selectNeedBid, submitBidProposal } from "../../lib/api";
import { HelpTooltip, InfoBox } from "../../components/HelpTooltip";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

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
  createdAt: string;
  status: "EN_REVISION" | "ACEPTADA" | "RECHAZADA";
};

type CategoryOption = {
  label: string;
  group: "HOGAR" | "EMPRESA" | "VEHICULOS" | "TECNICO" | "COCINA" | "EXTERIORES";
  keywords: string[];
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { label: "Electricidad residencial", group: "HOGAR", keywords: ["electricista", "tomacorriente", "luces", "cableado"] },
  { label: "Plomería y fugas", group: "HOGAR", keywords: ["plomero", "agua", "tuberia", "baño", "grifo"] },
  { label: "Pintura interior", group: "HOGAR", keywords: ["pintura", "pared", "techo", "acabados"] },
  { label: "Pintura exterior", group: "HOGAR", keywords: ["fachada", "pintura", "exterior"] },
  { label: "Carpintería general", group: "HOGAR", keywords: ["madera", "mueble", "puerta", "closet"] },
  { label: "Cerrajería", group: "HOGAR", keywords: ["cerradura", "llave", "puerta"] },
  { label: "Drywall y gypsum", group: "HOGAR", keywords: ["tabique", "gypsum", "pared"] },
  { label: "Albañilería y resanes", group: "HOGAR", keywords: ["albañil", "cemento", "grieta", "resane"] },
  { label: "Impermeabilización", group: "HOGAR", keywords: ["humedad", "techo", "filtración"] },
  { label: "Instalación de pisos", group: "HOGAR", keywords: ["ceramica", "porcelanato", "vinil", "piso"] },
  { label: "Aires acondicionados", group: "HOGAR", keywords: ["aire", "clima", "mantenimiento", "split"] },
  { label: "Refrigeración", group: "HOGAR", keywords: ["nevera", "refrigerador", "frio"] },
  { label: "Limpieza profunda", group: "HOGAR", keywords: ["limpieza", "desinfección", "hogar"] },
  { label: "Control de plagas", group: "HOGAR", keywords: ["fumigación", "insectos", "roedores"] },

  { label: "Mantenimiento eléctrico comercial", group: "EMPRESA", keywords: ["empresa", "tablero", "cableado"] },
  { label: "Mantenimiento preventivo oficinas", group: "EMPRESA", keywords: ["oficina", "preventivo", "mantenimiento"] },
  { label: "Remodelación de oficinas", group: "EMPRESA", keywords: ["oficina", "remodelación", "corporativo"] },
  { label: "Redes y cableado estructurado", group: "EMPRESA", keywords: ["red", "internet", "cableado", "rack"] },
  { label: "CCTV y seguridad", group: "EMPRESA", keywords: ["camaras", "cctv", "alarma", "seguridad"] },
  { label: "Señalética y adecuaciones", group: "EMPRESA", keywords: ["señalización", "adecuación", "local"] },

  { label: "Mecánica automotriz", group: "VEHICULOS", keywords: ["auto", "motor", "mecanico", "vehículo"] },
  { label: "Electricidad automotriz", group: "VEHICULOS", keywords: ["batería", "alternador", "luces", "vehículo"] },
  { label: "Latonería y pintura vehicular", group: "VEHICULOS", keywords: ["choque", "latoneria", "pintura"] },
  { label: "Llantas y frenos", group: "VEHICULOS", keywords: ["frenos", "llantas", "alineación"] },
  { label: "Lavado y detallado", group: "VEHICULOS", keywords: ["carwash", "detallado", "pulido"] },
  { label: "Mantenimiento de motos", group: "VEHICULOS", keywords: ["moto", "motocicleta", "cadena", "frenos"] },

  { label: "Soporte técnico PC/Laptop", group: "TECNICO", keywords: ["computadora", "laptop", "software", "soporte"] },
  { label: "Reparación de impresoras", group: "TECNICO", keywords: ["impresora", "tinta", "escaner"] },
  { label: "Telefonía y dispositivos", group: "TECNICO", keywords: ["celular", "tablet", "pantalla"] },
  { label: "Domótica y smart home", group: "TECNICO", keywords: ["domótica", "asistente", "automatización"] },
  { label: "Instalación de routers/WiFi", group: "TECNICO", keywords: ["wifi", "router", "señal"] },

  { label: "Mantenimiento de cocina industrial", group: "COCINA", keywords: ["campana", "horno", "industrial"] },
  { label: "Reparación de estufas y hornos", group: "COCINA", keywords: ["estufa", "horno", "gas"] },
  { label: "Instalación de campanas extractoras", group: "COCINA", keywords: ["campana", "extractor", "cocina"] },
  { label: "Mesones y mobiliario de cocina", group: "COCINA", keywords: ["mesón", "gabinete", "cocina"] },

  { label: "Jardinería", group: "EXTERIORES", keywords: ["jardin", "plantas", "poda"] },
  { label: "Corte de césped", group: "EXTERIORES", keywords: ["cesped", "corte", "grama"] },
  { label: "Riego y aspersores", group: "EXTERIORES", keywords: ["riego", "aspersor", "jardin"] },
  { label: "Limpieza de fachadas", group: "EXTERIORES", keywords: ["fachada", "lavado", "exterior"] },
  { label: "Portones y puertas automáticas", group: "EXTERIORES", keywords: ["porton", "motor", "automático"] }
];

export function BiddingView() {
  const { session } = useAuth();
  const role = session?.user.role;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [urgencyPreset, setUrgencyPreset] = useState<"HOY" | "MANANA" | "SEMANA" | "FECHA">("HOY");
  const [preferredDate, setPreferredDate] = useState("");

  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [costInput, setCostInput] = useState("");
  const [summaryInput, setSummaryInput] = useState("");

  const [bids, setBids] = useState<BidItem[]>([]);
  const [workerTracking, setWorkerTracking] = useState<WorkerBidTrack[]>([]);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingFilter, setTrackingFilter] = useState<"TODAS" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA">("TODAS");
  const [trackingSort, setTrackingSort] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedNeed = needs.find((need) => need.id === selectedNeedId) ?? null;

  const clientOpenNeeds = useMemo(() => needs.filter((need) => need.status === "OPEN").length, [needs]);
  const clientAssignedNeeds = useMemo(() => needs.filter((need) => need.status === "ASSIGNED").length, [needs]);
  const selectedNeedBudgetRange = useMemo(() => {
    if (bids.length === 0) return null;
    const values = bids.map((bid) => Number(bid.laborCost));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max };
  }, [bids]);

  const getNeedRemainingDays = (createdAt: string) => {
    const elapsedDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 3 - elapsedDays);
  };

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
            createdAt: bid.createdAt,
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
      setMessage("❌ Solo clientes pueden publicar necesidades. Si eres trabajador, ve a la pestaña 'Licitación' para postular.");
      return;
    }

    // Validaciones detalladas
    if (!title.trim()) {
      setMessage("⚠️ El título es obligatorio. Escribe qué necesitas (ej: 'Reparar fuga en cocina').");
      return;
    }
    if (!description.trim()) {
      setMessage("⚠️ La descripción es necesaria. Explica el problema, ubicación y detalles importantes.");
      return;
    }
    if (!category.trim()) {
      setMessage("⚠️ Escoge una categoría. Usa el buscador de arriba o selecciona de las sugeridas.");
      return;
    }

    const urgencyLabel =
      urgencyPreset === "HOY"
        ? "Urgente (hoy)"
        : urgencyPreset === "MANANA"
          ? "Mañana"
          : urgencyPreset === "SEMANA"
            ? "Próxima semana"
            : preferredDate
              ? `Fecha específica: ${preferredDate}`
              : "Fecha específica por confirmar";

    const descriptionPayload = `${description.trim()}\n\nUrgencia solicitada: ${urgencyLabel}`;

    try {
      setBusy(true);
      const created = await publishServiceNeed(
        {
          clientId: session.user.userId,
          title: title.trim(),
          description: descriptionPayload,
          category: category.trim()
        },
        session.accessToken
      );
      setSelectedNeedId(created.id);
      setTitle("");
      setDescription("");
      setCategory("");
      setUrgencyPreset("HOY");
      setPreferredDate("");
      await loadNeeds();
      setMessage(`✅ Oportunidad publicada. Los técnicos ya pueden verla y enviar propuestas.`);
    } catch {
      setMessage("❌ No se pudo publicar la oportunidad. Intenta de nuevo en unos momentos.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmitBid = async () => {
    if (!session || !selectedNeedId) return;
    if (role !== "WORKER") {
      setMessage("❌ Solo técnicos/trabajadores pueden enviar propuestas.");
      return;
    }

    const laborCost = Number(costInput);
    
    // Validaciones detalladas
    if (!costInput.trim()) {
      setMessage("⚠️ Ingresa el precio que cobrarías por este trabajo.");
      return;
    }
    if (!Number.isFinite(laborCost)) {
      setMessage("⚠️ El precio debe ser un número válido (ej: 150.50).");
      return;
    }
    if (laborCost <= 0) {
      setMessage("⚠️ El precio debe ser mayor a cero.");
      return;
    }
    if (!summaryInput.trim()) {
      setMessage("⚠️ Escribe una breve propuesta (por qué tú, cómo lo harías, materiales necesarios, etc.).");
      return;
    }
    if (summaryInput.trim().length < 10) {
      setMessage("⚠️ La propuesta debe tener al menos 10 caracteres para que la consideren.");
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
      setMessage("✅ Propuesta enviada exitosamente. El cliente la revisará pronto.");
    } catch (error) {
      if (error instanceof Error && error.message.includes("insufficient")) {
        setMessage("❌ Saldo insuficiente. Carga crédito antes de postular (el crédito mínimo es $" + (session?.user.credits ?? "3") + ").");
      } else {
        setMessage("❌ No se pudo enviar la propuesta. Intenta de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onSelectBid = async (bidId: string) => {
    if (!session || role !== "CLIENT" || !selectedNeedId) return;

    try {
      setBusy(true);
      await selectNeedBid(selectedNeedId, bidId, session.user.userId, session.accessToken);
      setMessage("✅ Propuesta seleccionada. El trabajo fue asignado a este técnico y ya no aparecerá para otros.");
      await loadNeeds();
      await loadBidsForNeed(selectedNeedId);
    } catch {
      setMessage("❌ No se pudo asignar esta propuesta. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const workerBidOnSelected = role === "WORKER" && bids.some((bid) => bid.workerId === session?.user.userId);

  const filteredWorkerTracking = useMemo(() => {
    const base = workerTracking.filter((track) => trackingFilter === "TODAS" || track.status === trackingFilter);
    return [...base].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return trackingSort === "NEWEST" ? bTime - aTime : aTime - bTime;
    });
  }, [workerTracking, trackingFilter, trackingSort]);

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

  const filteredCategoryOptions = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return CATEGORY_OPTIONS;
    return CATEGORY_OPTIONS.filter((option) => {
      return (
        option.label.toLowerCase().includes(query) ||
        option.group.toLowerCase().includes(query) ||
        option.keywords.some((keyword) => keyword.toLowerCase().includes(query))
      );
    });
  }, [categoryQuery]);

  return (
    <section className="space-y-4">
      {/* Role-specific header */}
      <article className="rounded-lg border-2 border-brand-900 bg-gradient-to-r from-brand-900 to-brand-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            {role === "CLIENT" ? (
              <>
                <h1 className="text-2xl font-extrabold">Crear Oportunidades & Revisar Propuestas</h1>
                <p className="mt-1 text-sm text-brand-100">Publica trabajos, recibe ofertas de técnicos y selecciona al mejor.</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold">Busca Trabajos & Envía Propuestas</h1>
                <p className="mt-1 text-sm text-brand-100">Ve oportunidades disponibles y postúlate con tus mejores precios.</p>
              </>
            )}
          </div>
          <div className="rounded-full bg-white/20 px-4 py-2">
            <p className="text-sm font-bold">Modo: {role === "CLIENT" ? "Cliente" : "Técnico"}</p>
          </div>
        </div>
      </article>

      {/* Messages */}
      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
          message.includes("✅")
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : message.includes("❌")
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {message}
        </div>
      )}

      {/* Main content */}
      <div className="card">
        <div className={"grid gap-3 " + (role === "WORKER" ? "lg:grid-cols-[1.1fr_1fr]" : "md:grid-cols-2")}>
        {role === "CLIENT" && (
          <div className="rounded-xl border border-brand-100 bg-white p-4">
            <p className="font-bold">Crear nueva oportunidad de trabajo</p>
            <p className="text-sm">Publica una necesidad clara para recibir mejores propuestas.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <p className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-900">
                Oportunidades abiertas: {clientOpenNeeds}
              </p>
              <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Asignadas: {clientAssignedNeeds}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                Propuestas recibidas: {bids.length}
              </p>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <label className="block text-xs font-semibold text-slate-600">Título del trabajo</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Ej: Reparar fuga en cocina"
              />
              <label className="block text-xs font-semibold text-slate-600">Urgencia y detalles</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Describe el alcance, urgencia y detalles"
              />
              <label className="block text-xs font-semibold text-slate-600">Categoría</label>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Ej: PLOMERO"
              />

              <label className="block text-xs font-semibold text-slate-600">Buscar categoría rápida</label>
              <input
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
                className="w-full rounded-lg border border-brand-200 px-3 py-2"
                placeholder="Ej: pintura, césped, cocina, vehículo, oficina..."
              />

              <div className="max-h-36 space-y-2 overflow-auto rounded-lg border border-brand-100 bg-brand-50 p-2">
                {filteredCategoryOptions.slice(0, 18).map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setCategory(option.label);
                      setCategoryQuery(option.label);
                    }}
                    className={
                      "mr-2 mb-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold " +
                      (category === option.label ? "bg-brand-900 text-white" : "bg-white text-brand-900")
                    }
                  >
                    <span>{option.label}</span>
                    <span className="opacity-70">· {option.group}</span>
                  </button>
                ))}
                {filteredCategoryOptions.length === 0 && (
                  <p className="text-xs text-slate-600">No encontramos coincidencias. Puedes escribir una categoría personalizada.</p>
                )}
              </div>

              <label className="block text-xs font-semibold text-slate-600">¿Para cuándo lo necesitas?</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { id: "HOY", label: "Urgente (hoy)" },
                  { id: "MANANA", label: "Mañana" },
                  { id: "SEMANA", label: "Próxima semana" }
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setUrgencyPreset(option.id as "HOY" | "MANANA" | "SEMANA")}
                    className={
                      "rounded-lg px-3 py-2 text-xs font-bold " +
                      (urgencyPreset === option.id ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-900")
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(event) => {
                    setPreferredDate(event.target.value);
                    if (event.target.value) {
                      setUrgencyPreset("FECHA");
                    }
                  }}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreferredDate("");
                    setUrgencyPreset("HOY");
                  }}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  Limpiar fecha
                </button>
              </div>
            </div>
            <button
              onClick={onPublishNeed}
              disabled={busy || !title.trim() || !description.trim() || !category.trim()}
              className="mt-3 w-full rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Publicando..." : "Publicar oportunidad"}
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
                <p className="mt-1 text-xs text-slate-500">
                  {need.status === "OPEN" ? `Abierta · ${getNeedRemainingDays(need.createdAt)} días restantes` : "Asignada al técnico"}
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

          {role === "CLIENT" && selectedNeed && (
            <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs">
              <p className="font-bold text-brand-900">Oportunidad seleccionada</p>
              <p className="mt-1 text-slate-700">{selectedNeed.title}</p>
              <p className="text-slate-600">{selectedNeed.description}</p>
              <p className="mt-1 text-slate-700">Propuestas: {bids.length}</p>
              <p className="text-slate-700">
                Presupuesto estimado: {selectedNeedBudgetRange ? `$${selectedNeedBudgetRange.min.toFixed(2)} - $${selectedNeedBudgetRange.max.toFixed(2)}` : "Sin propuestas aún"}
              </p>
            </div>
          )}
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
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[
                  { id: "TODAS", label: "Todas" },
                  { id: "EN_REVISION", label: "En revisión" },
                  { id: "ACEPTADA", label: "Aceptadas" },
                  { id: "RECHAZADA", label: "Rechazadas" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTrackingFilter(item.id as "TODAS" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA")}
                    className={
                      "rounded-full px-2 py-1 text-[11px] font-bold " +
                      (trackingFilter === item.id ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-900")
                    }
                  >
                    {item.label}
                  </button>
                ))}
                <select
                  value={trackingSort}
                  onChange={(event) => setTrackingSort(event.target.value as "NEWEST" | "OLDEST")}
                  className="rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-bold text-brand-900"
                >
                  <option value="NEWEST">Más recientes</option>
                  <option value="OLDEST">Más antiguas</option>
                </select>
              </div>
              {trackingBusy ? (
                <p className="mt-2 text-xs text-slate-600">Actualizando seguimiento...</p>
              ) : workerTracking.length === 0 ? (
                <p className="mt-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">
                  Aún no has enviado propuestas.
                </p>
              ) : filteredWorkerTracking.length === 0 ? (
                <p className="mt-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">
                  No hay propuestas para el filtro seleccionado.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {filteredWorkerTracking.slice(0, 8).map((track) => (
                    <article key={track.bidId} className="rounded-lg border border-brand-100 bg-brand-50 p-2 text-xs">
                      <p className="font-bold">{track.needTitle}</p>
                      <p>ID: #{track.bidId.slice(0, 8)}</p>
                      <p>Costo: ${Number(track.laborCost).toFixed(2)}</p>
                      <p>Fecha: {new Date(track.createdAt).toLocaleString()}</p>
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

      {role === "CLIENT" && <div className="mt-4 rounded-xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-bold">Propuestas para tu oportunidad</p>
            <p className="text-xs text-slate-600">
              {selectedNeed ? `Revisa y selecciona la mejor propuesta para: ${selectedNeed.title}` : "Selecciona una necesidad para revisar propuestas."}
            </p>
          </div>
          {selectedNeed?.status === "ASSIGNED" && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
              Oportunidad ya asignada
            </span>
          )}
        </div>

        <div className="space-y-3">
          {bids.map((bid) => (
            <article key={bid.id} className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">Propuesta #{bid.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">{new Date(bid.createdAt).toLocaleString()}</p>
              </div>
              <p>Worker: {bid.workerId}</p>
              <p>Costo ofertado: ${Number(bid.laborCost).toFixed(2)}</p>
              <p>Metodología: {bid.summary}</p>
              {selectedNeed?.status === "OPEN" && (
                <button
                  onClick={() => onSelectBid(bid.id)}
                  disabled={busy}
                  className="mt-2 rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
                >
                  Seleccionar propuesta
                </button>
              )}
              {selectedNeed?.status === "ASSIGNED" && selectedNeed.selectedBidId === bid.id && (
                <p className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Propuesta asignada</p>
              )}
            </article>
          ))}
          {bids.length === 0 && (
            <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
              {selectedNeedId ? "Sin propuestas cargadas para esta necesidad." : "Selecciona una necesidad para ver propuestas."}
            </p>
          )}
        </div>
      </div>}
      </div>
    </section>
  );
}
