import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listNeedBids, listServiceNeeds, publishServiceNeed, selectNeedBid, submitBidProposal } from "../../lib/api";
import { InfoBox } from "../../components/HelpTooltip";
import {
  Building2,
  CarFront,
  ChevronDown,
  ChevronUp,
  Home,
  Laptop,
  Trees,
  UtensilsCrossed,
  Wrench,
  type LucideIcon
} from "lucide-react";

const CLIENT_NEED_DRAFT_PREFIX = "reparando:bidding:client-draft:";
const TITLE_MIN_LENGTH = 8;
const DESCRIPTION_MIN_LENGTH = 24;
const BALANCE_VALUE_KEY = "reparando.balance.value";
const BALANCE_BLOCKED_KEY = "reparando.balance.blocked";

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

const GROUP_ICON_MAP: Record<CategoryOption["group"], LucideIcon> = {
  HOGAR: Home,
  EMPRESA: Building2,
  VEHICULOS: CarFront,
  TECNICO: Laptop,
  COCINA: UtensilsCrossed,
  EXTERIORES: Trees
};

type GeneralCategoryTile = {
  label: string;
  group: CategoryOption["group"];
  seedCategory: string;
  tags: string[];
};

const GENERAL_CATEGORY_TILES: GeneralCategoryTile[] = [
  { label: "Plomeria", group: "HOGAR", seedCategory: "Plomería y fugas", tags: ["agua", "tuberia", "fuga"] },
  { label: "Carpinteria", group: "HOGAR", seedCategory: "Carpintería general", tags: ["madera", "mueble", "puerta"] },
  { label: "Pintura", group: "HOGAR", seedCategory: "Pintura interior", tags: ["pared", "techo", "acabados"] },
  { label: "Electricidad", group: "HOGAR", seedCategory: "Electricidad residencial", tags: ["cableado", "luces", "tablero"] },
  { label: "Mecanica", group: "VEHICULOS", seedCategory: "Mecánica automotriz", tags: ["auto", "motor", "frenos"] },
  { label: "Tecnologia", group: "TECNICO", seedCategory: "Soporte técnico PC/Laptop", tags: ["pc", "laptop", "wifi"] },
  { label: "Cocina", group: "COCINA", seedCategory: "Reparación de estufas y hornos", tags: ["estufa", "horno", "campana"] },
  { label: "Jardineria", group: "EXTERIORES", seedCategory: "Jardinería", tags: ["poda", "cesped", "riego"] },
  { label: "Remodelacion", group: "EMPRESA", seedCategory: "Remodelación de oficinas", tags: ["obra", "adecuacion", "espacios"] },
  { label: "Cerrajeria", group: "HOGAR", seedCategory: "Cerrajería", tags: ["cerradura", "llave", "seguridad"] }
];

export function BiddingView() {
  const { session } = useAuth();
  const role = session?.user.role;

  // Tabs state - different for CLIENT vs WORKER
  const [activeTab, setActiveTab] = useState<"CREATE" | "OPEN" | "MANAGE" | "TRACKING">(
    role === "CLIENT" ? "CREATE" : "OPEN"
  );

  // Form state for creating opportunities (CLIENT only)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [urgencyPreset, setUrgencyPreset] = useState<"HOY" | "MANANA" | "SEMANA" | "FECHA">("HOY");
  const [preferredDate, setPreferredDate] = useState("");
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [subCategory, setSubCategory] = useState("");
  const [locationAddress, setLocationAddress] = useState("Quito, Pichincha");
  const [locationReference, setLocationReference] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [stepAttempted, setStepAttempted] = useState(false);
  const [balanceValue, setBalanceValue] = useState<number>(-1.5);
  const [isBalanceBlocked, setIsBalanceBlocked] = useState(false);

  // Needs and bidding state
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [costInput, setCostInput] = useState("");
  const [summaryInput, setSummaryInput] = useState("");
  const [expandedNeedId, setExpandedNeedId] = useState<string | null>(null);

  const [bids, setBids] = useState<BidItem[]>([]);
  const [workerTracking, setWorkerTracking] = useState<WorkerBidTrack[]>([]);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingFilter, setTrackingFilter] = useState<"TODAS" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA">("TODAS");
  const [trackingSort, setTrackingSort] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const selectedNeed = needs.find((need) => need.id === selectedNeedId) ?? null;

  const clientDraftKey = useMemo(() => {
    if (!session || role !== "CLIENT") return null;
    return `${CLIENT_NEED_DRAFT_PREFIX}${session.user.userId}`;
  }, [session, role]);

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

  useEffect(() => {
    const syncBalance = () => {
      const storedValue = Number(window.localStorage.getItem(BALANCE_VALUE_KEY));
      const storedBlocked = window.localStorage.getItem(BALANCE_BLOCKED_KEY) === "true";
      if (!Number.isNaN(storedValue)) {
        setBalanceValue(storedValue);
      }
      setIsBalanceBlocked(storedBlocked);
    };

    syncBalance();
    const onBalanceUpdate = () => syncBalance();
    window.addEventListener("reparando-balance-update", onBalanceUpdate as EventListener);
    window.addEventListener("storage", onBalanceUpdate);

    return () => {
      window.removeEventListener("reparando-balance-update", onBalanceUpdate as EventListener);
      window.removeEventListener("storage", onBalanceUpdate);
    };
  }, []);

  useEffect(() => {
    if (!clientDraftKey) return;

    try {
      const raw = window.localStorage.getItem(clientDraftKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        title?: string;
        description?: string;
        category?: string;
        subCategory?: string;
        categoryQuery?: string;
        urgencyPreset?: "HOY" | "MANANA" | "SEMANA" | "FECHA";
        preferredDate?: string;
        createStep?: 1 | 2 | 3 | 4;
        locationAddress?: string;
        locationReference?: string;
        budgetEstimate?: string;
        savedAt?: string;
      };

      setTitle(parsed.title ?? "");
      setDescription(parsed.description ?? "");
      setCategory(parsed.category ?? "");
      setSubCategory(parsed.subCategory ?? "");
      setCategoryQuery(parsed.categoryQuery ?? "");
      setUrgencyPreset(parsed.urgencyPreset ?? "HOY");
      setPreferredDate(parsed.preferredDate ?? "");
      setCreateStep(parsed.createStep ?? 1);
      setLocationAddress(parsed.locationAddress ?? "Quito, Pichincha");
      setLocationReference(parsed.locationReference ?? "");
      setBudgetEstimate(parsed.budgetEstimate ?? "");
      setDraftSavedAt(parsed.savedAt ?? null);
    } catch {
      // Ignore malformed local drafts.
    }
  }, [clientDraftKey]);

  useEffect(() => {
    if (!clientDraftKey || role !== "CLIENT") return;

    const payload = {
      title,
      description,
      category,
      subCategory,
      categoryQuery,
      urgencyPreset,
      preferredDate,
      createStep,
      locationAddress,
      locationReference,
      budgetEstimate,
      savedAt: new Date().toISOString()
    };

    try {
      window.localStorage.setItem(clientDraftKey, JSON.stringify(payload));
      setDraftSavedAt(payload.savedAt);
    } catch {
      // Ignore storage quota errors.
    }
  }, [
    clientDraftKey,
    role,
    title,
    description,
    category,
    subCategory,
    categoryQuery,
    urgencyPreset,
    preferredDate,
    createStep,
    locationAddress,
    locationReference,
    budgetEstimate
  ]);

  const onPublishNeed = async () => {
    if (!session) return;
    if (role !== "CLIENT") {
      setMessage("❌ Solo clientes pueden publicar necesidades. Si eres trabajador, ve a la pestaña 'Licitación' para postular.");
      return;
    }
    if (isBalanceBlocked) {
      setMessage("❌ Saldo en alerta crítica (<= -$3.00). Regulariza Mis Finanzas para publicar oportunidades.");
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

    if (title.trim().length < TITLE_MIN_LENGTH) {
      setMessage(`⚠️ El título debe tener al menos ${TITLE_MIN_LENGTH} caracteres para que los técnicos entiendan mejor el trabajo.`);
      return;
    }
    if (description.trim().length < DESCRIPTION_MIN_LENGTH) {
      setMessage(`⚠️ La descripción debe tener al menos ${DESCRIPTION_MIN_LENGTH} caracteres con contexto, alcance y ubicación.`);
      return;
    }
    if (urgencyPreset === "FECHA" && !preferredDate) {
      setMessage("⚠️ Si eliges fecha específica, selecciona una fecha para publicar.");
      return;
    }

    const detailBlocks = [
      description.trim(),
      `Urgencia solicitada: ${publishUrgencyLabel}`,
      `Ubicación: ${locationAddress.trim() || "Por confirmar"}`,
      locationReference.trim() ? `Referencia: ${locationReference.trim()}` : "",
      subCategory.trim() ? `Subcategoría: ${subCategory.trim()}` : "",
      budgetEstimate.trim() ? `Presupuesto estimado: $${budgetEstimate.trim()}` : ""
    ].filter(Boolean);

    const descriptionPayload = detailBlocks.join("\n\n");

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
      setSubCategory("");
      setCategoryQuery("");
      setUrgencyPreset("HOY");
      setPreferredDate("");
      setCreateStep(1);
      setLocationAddress("Quito, Pichincha");
      setLocationReference("");
      setBudgetEstimate("");
      setPhotoNames([]);
      if (clientDraftKey) {
        window.localStorage.removeItem(clientDraftKey);
      }
      setDraftSavedAt(null);
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
        setMessage("❌ Saldo insuficiente. Carga crédito antes de postular (mínimo requerido: $3).");
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

  const filteredGeneralTiles = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return GENERAL_CATEGORY_TILES;
    return GENERAL_CATEGORY_TILES.filter((tile) => {
      return (
        tile.label.toLowerCase().includes(query) ||
        tile.group.toLowerCase().includes(query) ||
        tile.seedCategory.toLowerCase().includes(query) ||
        tile.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [categoryQuery]);

  const publishUrgencyLabel = useMemo(() => {
    if (urgencyPreset === "HOY") return "Urgente (hoy)";
    if (urgencyPreset === "MANANA") return "Mañana";
    if (urgencyPreset === "SEMANA") return "Próxima semana";
    return preferredDate ? `Fecha específica: ${preferredDate}` : "Fecha específica por confirmar";
  }, [urgencyPreset, preferredDate]);

  const publishValidation = useMemo(() => {
    const titleLen = title.trim().length;
    const descriptionLen = description.trim().length;
    const categoryLen = category.trim().length;
    const locationLen = locationAddress.trim().length;
    const hasDateIfNeeded = urgencyPreset !== "FECHA" || Boolean(preferredDate);

    return {
      titleLen,
      descriptionLen,
      titleReady: titleLen >= TITLE_MIN_LENGTH,
      descriptionReady: descriptionLen >= DESCRIPTION_MIN_LENGTH,
      categoryReady: categoryLen > 0,
      logisticsReady: locationLen > 0,
      hasDateIfNeeded,
      ready:
        titleLen >= TITLE_MIN_LENGTH &&
        descriptionLen >= DESCRIPTION_MIN_LENGTH &&
        categoryLen > 0 &&
        locationLen > 0 &&
        hasDateIfNeeded
    };
  }, [title, description, category, locationAddress, urgencyPreset, preferredDate]);

  const canContinueStep1 = publishValidation.titleReady && publishValidation.descriptionReady;
  const canContinueStep2 = publishValidation.categoryReady;
  const canContinueStep3 = publishValidation.logisticsReady && publishValidation.hasDateIfNeeded;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(locationAddress || "Quito, Pichincha")}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  const titleInvalid = stepAttempted && !publishValidation.titleReady;
  const descriptionInvalid = stepAttempted && !publishValidation.descriptionReady;
  const categoryInvalid = stepAttempted && !publishValidation.categoryReady;
  const locationInvalid = stepAttempted && !publishValidation.logisticsReady;
  const dateInvalid = stepAttempted && !publishValidation.hasDateIfNeeded;

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    setCreateStep(step);
    setStepAttempted(false);
  };

  const goNextFromStep = (step: 1 | 2 | 3) => {
    const valid = step === 1 ? canContinueStep1 : step === 2 ? canContinueStep2 : canContinueStep3;
    if (!valid) {
      setStepAttempted(true);
      return;
    }
    setStepAttempted(false);
    setCreateStep((step + 1) as 2 | 3 | 4);
  };

  const onUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("⚠️ Tu navegador no permite geolocalización. Ingresa la dirección manualmente.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        setLocationAddress(`Quito, Pichincha (${lat}, ${lng})`);
        setMessage("✅ Ubicación actual cargada. Puedes ajustar la dirección si hace falta.");
      },
      () => {
        setMessage("⚠️ No pudimos leer tu ubicación. Revisa permisos o escribe la dirección manualmente.");
      }
    );
  };

  // Tab buttons styles
  const tabButtonClass = (tab: string, active: boolean) =>
    `px-4 py-2 font-semibold rounded-lg transition ${
      active ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-900 hover:bg-brand-100"
    }`;

  return (
    <section className="space-y-4">
      {/* Role-specific header */}
      <article className="rounded-lg border-2 border-brand-900 bg-gradient-to-r from-brand-900 to-brand-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
              Licitaciones & Oportunidades • v2.2 • Separadas por Tab
            </p>
            {role === "CLIENT" ? (
              <>
                <h1 className="text-2xl font-extrabold">Centro de Oportunidades</h1>
                <p className="mt-1 text-sm text-brand-100">Publica trabajos, revisa postulaciones y selecciona el mejor técnico.</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold">Mercado de Trabajos</h1>
                <p className="mt-1 text-sm text-brand-100">Ve todas las oportunidades disponibles y envía tus propuestas.</p>
              </>
            )}
          </div>
          <div className="rounded-full bg-white/20 px-4 py-2">
            <p className="text-sm font-bold">{role === "CLIENT" ? "👨‍💼 Cliente" : "👷 Técnico"}</p>
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

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {role === "CLIENT" ? (
          <>
            <button
              onClick={() => setActiveTab("CREATE")}
              className={tabButtonClass("CREATE", activeTab === "CREATE")}
            >
              ✍️ Crear Oportunidad
            </button>
            <button
              onClick={() => setActiveTab("MANAGE")}
              className={tabButtonClass("MANAGE", activeTab === "MANAGE")}
            >
              📋 Mis Oportunidades ({clientOpenNeeds})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab("OPEN")}
              className={tabButtonClass("OPEN", activeTab === "OPEN")}
            >
              🔍 Oportunidades Abiertas ({needs.filter(n => n.status === "OPEN").length})
            </button>
            <button
              onClick={() => setActiveTab("TRACKING")}
              className={tabButtonClass("TRACKING", activeTab === "TRACKING")}
            >
              📊 Mis Postulaciones ({workerTracking.length})
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* CLIENT: CREATE TAB */}
        {role === "CLIENT" && activeTab === "CREATE" && (
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Centro de Oportunidades - Wizard 2.0</h2>
                <p className="text-sm text-slate-600">Flujo secuencial con validación visual por paso.</p>
              </div>
              {draftSavedAt && (
                <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Borrador {new Date(draftSavedAt).toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 1, label: "Detalles", ready: canContinueStep1 },
                { id: 2, label: "Categoría", ready: canContinueStep2 },
                { id: 3, label: "Logística", ready: canContinueStep3 },
                { id: 4, label: "Finalizar", ready: publishValidation.ready }
              ].map((stepItem) => {
                const active = createStep === stepItem.id;
                return (
                  <button
                    key={stepItem.id}
                    type="button"
                    onClick={() => goToStep(stepItem.id as 1 | 2 | 3 | 4)}
                    className={
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition " +
                      (active
                        ? "border-brand-900 bg-brand-900 text-white"
                        : stepItem.ready
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600")
                    }
                  >
                    Paso {stepItem.id} · {stepItem.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <section className="space-y-4 lg:col-span-8">
                <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div key={createStep} className="wizard-slide-in space-y-3">
                    {createStep === 1 && (
                      <>
                        <p className="text-sm font-bold text-brand-900">Paso 1: ¿Qué necesitas?</p>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Título</label>
                          <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            className={
                              "w-full rounded-lg border px-3 py-2 text-sm " +
                              (titleInvalid ? "border-red-400 bg-red-50" : "border-brand-200")
                            }
                            placeholder="Ej: Reparar fuga en cocina"
                          />
                          <p className="mt-1 text-[11px] text-slate-500">{publishValidation.titleLen}/{TITLE_MIN_LENGTH} mínimo</p>
                          {titleInvalid && <p className="mt-1 text-xs font-semibold text-red-600">Mínimo {TITLE_MIN_LENGTH} caracteres.</p>}
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Descripción</label>
                          <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            className={
                              "min-h-24 w-full rounded-lg border px-3 py-2 text-sm " +
                              (descriptionInvalid ? "border-red-400 bg-red-50" : "border-brand-200")
                            }
                            placeholder="Describe el alcance, urgencia y contexto"
                          />
                          <p className="mt-1 text-[11px] text-slate-500">{publishValidation.descriptionLen}/{DESCRIPTION_MIN_LENGTH} mínimo</p>
                          {descriptionInvalid && <p className="mt-1 text-xs font-semibold text-red-600">Mínimo {DESCRIPTION_MIN_LENGTH} caracteres.</p>}
                        </div>
                      </>
                    )}

                    {createStep === 2 && (
                      <>
                        <p className="text-sm font-bold text-brand-900">Paso 2: Categoría y habilidades</p>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Categoría principal</label>
                          <input
                            value={categoryQuery}
                            onChange={(event) => {
                              setCategoryQuery(event.target.value);
                              setCategory(event.target.value);
                            }}
                            className={
                              "w-full rounded-lg border px-3 py-2 text-sm " +
                              (categoryInvalid ? "border-red-400 bg-red-50" : "border-brand-200")
                            }
                            placeholder="Busca o selecciona una categoría"
                          />
                          {categoryInvalid && <p className="mt-1 text-xs font-semibold text-red-600">Selecciona o escribe una categoría.</p>}
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Subcategoría detalle</label>
                          <input
                            value={subCategory}
                            onChange={(event) => setSubCategory(event.target.value)}
                            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-2 md:grid-cols-3">
                          {filteredGeneralTiles.map((tile) => {
                            const Icon = GROUP_ICON_MAP[tile.group] ?? Wrench;
                            return (
                              <button
                                key={tile.label}
                                type="button"
                                onClick={() => {
                                  setCategory(tile.seedCategory);
                                  setCategoryQuery(tile.label);
                                  setSubCategory(tile.label);
                                }}
                                className={
                                  "rounded-lg border px-2 py-2 text-left text-[11px] font-semibold transition " +
                                  (subCategory === tile.label || category === tile.seedCategory
                                    ? "border-brand-900 bg-brand-900 text-white"
                                    : "border-slate-200 bg-white text-brand-900 hover:border-brand-300")
                                }
                              >
                                <span className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-900">
                                  <Icon size={14} />
                                </span>
                                <p className="line-clamp-2">{tile.label}</p>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {createStep === 3 && (
                      <>
                        <p className="text-sm font-bold text-brand-900">Paso 3: ¿Cuándo y Dónde?</p>
                        <div className="overflow-hidden rounded-lg border border-slate-100">
                          <iframe title="Mapa de ubicación" src={mapEmbedUrl} className="h-44 w-full" loading="lazy" />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Ubicación</label>
                          <input
                            value={locationAddress}
                            onChange={(event) => setLocationAddress(event.target.value)}
                            className={
                              "w-full rounded-lg border px-3 py-2 text-sm " +
                              (locationInvalid ? "border-red-400 bg-red-50" : "border-brand-200")
                            }
                            placeholder="Quito, Pichincha"
                          />
                          {locationInvalid && <p className="mt-1 text-xs font-semibold text-red-600">La ubicación es obligatoria.</p>}
                        </div>

                        <input
                          value={locationReference}
                          onChange={(event) => setLocationReference(event.target.value)}
                          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                          placeholder="Referencia"
                        />

                        <button
                          type="button"
                          onClick={onUseCurrentLocation}
                          className="rounded-lg bg-brand-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-800"
                        >
                          Usar mi ubicación actual
                        </button>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "HOY", label: "Urgente" },
                            { id: "MANANA", label: "Mañana" },
                            { id: "SEMANA", label: "Próxima" }
                          ].map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setUrgencyPreset(option.id as "HOY" | "MANANA" | "SEMANA")}
                              className={
                                "rounded-lg px-2 py-2 text-xs font-bold transition " +
                                (urgencyPreset === option.id ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-900 hover:bg-brand-100")
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
                              if (event.target.value) setUrgencyPreset("FECHA");
                            }}
                            className={
                              "rounded-lg border px-3 py-2 text-sm " +
                              (dateInvalid ? "border-red-400 bg-red-50" : "border-brand-200")
                            }
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPreferredDate("");
                              setUrgencyPreset("HOY");
                            }}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Limpiar
                          </button>
                        </div>
                        {dateInvalid && <p className="text-xs font-semibold text-red-600">Selecciona fecha cuando uses modo fecha específica.</p>}
                      </>
                    )}

                    {createStep === 4 && (
                      <>
                        <p className="text-sm font-bold text-brand-900">Paso 4: Finalizar</p>
                        <input
                          type="number"
                          min="0"
                          value={budgetEstimate}
                          onChange={(event) => setBudgetEstimate(event.target.value)}
                          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                          placeholder="Presupuesto estimado"
                        />

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            const files = Array.from(event.target.files ?? []);
                            setPhotoNames(files.slice(0, 4).map((file) => file.name));
                          }}
                          className="w-full rounded-lg border border-dashed border-brand-200 bg-brand-50 px-3 py-3 text-sm"
                        />
                        {photoNames.length > 0 && (
                          <p className="text-[11px] text-slate-600">Fotos: {photoNames.join(", ")}</p>
                        )}

                        <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs text-brand-900">
                          <p><strong>Categoría:</strong> {categoryQuery || "Sin definir"}</p>
                          <p className="mt-1"><strong>Ubicación:</strong> {locationAddress || "Sin definir"}</p>
                          <p className="mt-1"><strong>Urgencia:</strong> {publishUrgencyLabel}</p>
                        </div>

                        {isBalanceBlocked && (
                          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            Mis Finanzas en alerta (${balanceValue.toFixed(2)}). Publicar está bloqueado hasta superar -$3.00.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => goToStep((createStep > 1 ? (createStep - 1) : 1) as 1 | 2 | 3 | 4)}
                      disabled={createStep === 1}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                    >
                      Atrás
                    </button>
                    {createStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => goNextFromStep(createStep as 1 | 2 | 3)}
                        className="rounded-lg bg-brand-900 px-3 py-2 text-sm font-bold text-white hover:bg-brand-800"
                      >
                        Siguiente
                      </button>
                    ) : (
                      <button
                        onClick={onPublishNeed}
                        disabled={busy || !publishValidation.ready || isBalanceBlocked}
                        className={
                          "rounded-lg px-3 py-2 text-sm font-bold text-white transition " +
                          (isBalanceBlocked ? "bg-red-400" : "bg-brand-900 hover:bg-brand-800") +
                          " disabled:cursor-not-allowed disabled:opacity-60"
                        }
                      >
                        {busy ? "Publicando..." : "Publicar Oportunidad"}
                      </button>
                    )}
                  </div>
                </article>
              </section>

              <aside className="space-y-3 lg:col-span-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-900">Logistics</p>
                  <p className="text-xs text-slate-500">Mapa dinámico según ubicación seleccionada</p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                    <iframe title="Mapa de logistics" src={mapEmbedUrl} className="h-48 w-full" loading="lazy" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-900">Oportunidades abiertas</p>
                    <p className="mt-1 text-3xl font-extrabold text-brand-900">{clientOpenNeeds}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Asignadas</p>
                    <p className="mt-1 text-3xl font-extrabold text-emerald-700">{clientAssignedNeeds}</p>
                  </div>
                </div>

                <InfoBox
                  variant={publishValidation.ready && !isBalanceBlocked ? "success" : "warning"}
                  title={
                    isBalanceBlocked
                      ? "Publicación bloqueada por saldo"
                      : publishValidation.ready
                        ? "Formulario listo para publicar"
                        : "Completa los pasos para publicar"
                  }
                  text={
                    isBalanceBlocked
                      ? `Saldo actual: $${balanceValue.toFixed(2)}. Debe ser mayor a -$3.00.`
                      : publishValidation.ready
                        ? `Urgencia seleccionada: ${publishUrgencyLabel}`
                        : "Revisa campos en rojo y avanza con el asistente."
                  }
                />
              </aside>
            </div>

            <div className="grid gap-3 border-t border-brand-100 pt-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setTitle("");
                  setDescription("");
                  setCategory("");
                  setSubCategory("");
                  setCategoryQuery("");
                  setUrgencyPreset("HOY");
                  setPreferredDate("");
                  setCreateStep(1);
                  setStepAttempted(false);
                  setLocationAddress("Quito, Pichincha");
                  setLocationReference("");
                  setBudgetEstimate("");
                  setPhotoNames([]);
                  if (clientDraftKey) {
                    window.localStorage.removeItem(clientDraftKey);
                    setDraftSavedAt(null);
                  }
                  setMessage("✅ Borrador limpiado.");
                }}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                🗑️ Limpiar Borrador
              </button>
              <div className="rounded-lg border border-brand-100 bg-white px-4 py-2 text-xs text-brand-900">
                Layout Mobile-First activo con sidebar en desktop y navegación inferior en móvil.
              </div>
            </div>
          </div>
        )}

        {/* CLIENT: MANAGE TAB - Mis Oportunidades */}
        {role === "CLIENT" && activeTab === "MANAGE" && (
          <div className="space-y-4">
            {needs.filter(n => n.status === "OPEN" || n.status === "ASSIGNED").length === 0 ? (
              <div className="rounded-xl border border-brand-100 bg-white p-6 text-center">
                <p className="text-slate-600">No tienes oportunidades publicadas aún.</p>
                <button
                  onClick={() => setActiveTab("CREATE")}
                  className="mt-3 rounded-lg bg-brand-900 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 transition"
                >
                  ➕ Crear tu primera oportunidad
                </button>
              </div>
            ) : (
              needs
                .filter(n => n.status === "OPEN" || n.status === "ASSIGNED")
                .map((need) => (
                  <div key={need.id} className="rounded-xl border border-brand-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition">
                    <button
                      onClick={() => setExpandedNeedId(expandedNeedId === need.id ? null : need.id)}
                      className="w-full p-4 text-left hover:bg-brand-50 transition flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{need.title}</h3>
                          <span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                            need.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {need.status === "OPEN" ? "Abierta" : "Asignada"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{need.category}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {need.status === "OPEN" ? `Abierta hace ${getNeedRemainingDays(need.createdAt)} días · 3 días restantes` : "Asignada"}
                        </p>
                      </div>
                      <div className="ml-4">
                        {expandedNeedId === need.id ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </button>

                    {expandedNeedId === need.id && (
                      <div className="border-t border-brand-100 p-4 space-y-4 bg-brand-50">
                        <div>
                          <p className="font-semibold text-sm text-slate-700 mb-2">Descripción</p>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{need.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-white border border-brand-100 p-3">
                            <p className="text-xs font-semibold text-slate-600"># Postulaciones</p>
                            <p className="text-2xl font-bold text-brand-900 mt-1">
                              {bids.filter(b => b.needId === need.id).length}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white border border-brand-100 p-3">
                            <p className="text-xs font-semibold text-slate-600">Rango de Precios</p>
                            {selectedNeedBudgetRange && need.id === selectedNeedId ? (
                              <p className="text-sm font-bold text-brand-900 mt-1">
                                ${selectedNeedBudgetRange.min.toFixed(2)} - ${selectedNeedBudgetRange.max.toFixed(2)}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-500 mt-1">-</p>
                            )}
                          </div>
                        </div>

                        {/* Postulations for this need */}
                        <div>
                          <p className="font-semibold text-sm text-slate-700 mb-3">Postulaciones Recibidas</p>
                          <div className="space-y-2 max-h-64 overflow-auto">
                            {bids.filter(b => b.needId === need.id).length === 0 ? (
                              <p className="text-xs text-slate-500 bg-white rounded-lg p-3">Aún sin postulaciones.</p>
                            ) : (
                              bids.filter(b => b.needId === need.id).map((bid) => (
                                <div key={bid.id} className="rounded-lg border border-brand-100 bg-white p-3 text-sm">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <p className="font-bold text-slate-900">Técnico #{bid.id.slice(0, 8)}</p>
                                      <p className="text-xs text-slate-500 mt-1">{new Date(bid.createdAt).toLocaleString()}</p>
                                    </div>
                                    <p className="font-bold text-brand-900 text-lg">${Number(bid.laborCost).toFixed(2)}</p>
                                  </div>
                                  <p className="text-xs text-slate-700 mb-3">📝 {bid.summary}</p>
                                  {need.status === "OPEN" && (
                                    <button
                                      onClick={() => onSelectBid(bid.id)}
                                      disabled={busy}
                                      className="w-full rounded-lg bg-brand-900 px-2 py-1.5 text-xs font-bold text-white hover:bg-brand-800 transition disabled:opacity-60"
                                    >
                                      ✅ Seleccionar Esta Postulación
                                    </button>
                                  )}
                                  {need.status === "ASSIGNED" && need.selectedBidId === bid.id && (
                                    <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded px-2 py-1">
                                      ✓ Postulación Seleccionada y Activa
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        )}

        {/* WORKER: OPEN TAB - Find Opportunities */}
        {role === "WORKER" && activeTab === "OPEN" && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Opportunities list */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="font-bold text-lg">🔍 Oportunidades Disponibles para Ofertar</h2>
              {needs.filter(n => n.status === "OPEN").length === 0 ? (
                <div className="rounded-lg border border-brand-100 bg-white p-6 text-center">
                  <p className="text-slate-600">No hay oportunidades disponibles en este momento.</p>
                </div>
              ) : (
                needs.filter(n => n.status === "OPEN").map((need) => (
                  <div
                    key={need.id}
                    onClick={() => setSelectedNeedId(need.id)}
                    className={`rounded-lg border-2 p-4 cursor-pointer transition ${
                      selectedNeedId === need.id
                        ? "border-brand-900 bg-brand-50"
                        : "border-brand-100 bg-white hover:border-brand-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg">{need.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{need.category}</p>
                      </div>
                      <p className="text-xs font-semibold rounded-full bg-slate-100 px-2 py-1 whitespace-nowrap">
                        {bids.filter(b => b.needId === need.id).length} postulaciones
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{need.description.split('\n')[0]}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      #{need.id.slice(0, 8)} · ⏰ {getNeedRemainingDays(need.createdAt)} días restantes
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Bid submission form */}
            {selectedNeed && (
              <div className="rounded-lg border border-brand-100 bg-white p-4 h-fit sticky top-4 shadow-md">
                <h3 className="font-bold text-lg">{selectedNeed.title}</h3>
                <p className="text-xs text-slate-500 mb-4">{selectedNeed.category}</p>
                
                <div className="bg-brand-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-xs font-semibold text-slate-600">📋 Descripción</p>
                  <p className="text-xs text-slate-700 mt-2 line-clamp-4">{selectedNeed.description}</p>
                </div>

                {selectedWorkerStatus && (
                  <div className={`rounded-lg px-3 py-2 mb-4 text-xs font-semibold text-center ${
                    selectedWorkerStatus === "Aceptada"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedWorkerStatus === "Rechazada"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedWorkerStatus}
                  </div>
                )}

                {!workerBidOnSelected && selectedNeed.status === "OPEN" && (
                  <>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">💰 Precio de Mano de Obra ($)</label>
                        <input
                          type="number"
                          value={costInput}
                          onChange={(event) => setCostInput(event.target.value)}
                          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                          placeholder="Ej: 150.50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">📝 Tu Propuesta</label>
                        <textarea
                          value={summaryInput}
                          onChange={(event) => setSummaryInput(event.target.value)}
                          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm min-h-20"
                          placeholder="Por qué eres el indicado, metodología, materiales, disponibilidad..."
                        />
                      </div>
                    </div>
                    <button
                      onClick={onSubmitBid}
                      disabled={busy}
                      className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                    >
                      {busy ? "⏳ Enviando..." : "✅ Enviar Postulación"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* WORKER: TRACKING TAB */}
        {role === "WORKER" && activeTab === "TRACKING" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {[
                { id: "TODAS", label: "Todas", count: workerTracking.length },
                { id: "EN_REVISION", label: "En revisión", count: workerTracking.filter(t => t.status === "EN_REVISION").length },
                { id: "ACEPTADA", label: "Aceptadas", count: workerTracking.filter(t => t.status === "ACEPTADA").length },
                { id: "RECHAZADA", label: "Rechazadas", count: workerTracking.filter(t => t.status === "RECHAZADA").length }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTrackingFilter(item.id as "TODAS" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA")}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-bold transition " +
                    (trackingFilter === item.id ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-900 hover:bg-brand-100")
                  }
                >
                  {item.label} ({item.count})
                </button>
              ))}
              <select
                value={trackingSort}
                onChange={(event) => setTrackingSort(event.target.value as "NEWEST" | "OLDEST")}
                className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-bold text-brand-900"
              >
                <option value="NEWEST">Más recientes</option>
                <option value="OLDEST">Más antiguas</option>
              </select>
            </div>

            {trackingBusy ? (
              <p className="text-center py-8 text-slate-600">⏳ Actualizando seguimiento...</p>
            ) : workerTracking.length === 0 ? (
              <div className="rounded-lg border border-brand-100 bg-brand-50 p-6 text-center">
                <p className="text-brand-900 font-semibold">📭 Aún no has enviado postulaciones.</p>
                <button
                  onClick={() => setActiveTab("OPEN")}
                  className="mt-3 rounded-lg bg-brand-900 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 transition"
                >
                  🔍 Ver Oportunidades Disponibles
                </button>
              </div>
            ) : filteredWorkerTracking.length === 0 ? (
              <p className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-center text-brand-900">
                No hay postulaciones para el filtro seleccionado.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredWorkerTracking.map((track) => (
                  <div key={track.bidId} className="rounded-lg border border-brand-100 bg-white p-4 shadow-sm hover:shadow-md transition">
                    <div className="mb-3">
                      <h4 className="font-bold text-slate-900">{track.needTitle}</h4>
                      <p className="text-xs text-slate-500 mt-1">#{track.bidId.slice(0, 8)}</p>
                    </div>
                    <div className="space-y-2 text-sm mb-3">
                      <p><span className="text-slate-600">💰 Precio:</span> <strong className="text-brand-900">${Number(track.laborCost).toFixed(2)}</strong></p>
                      <p className="text-xs text-slate-500">📅 {new Date(track.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      track.status === "EN_REVISION"
                        ? "bg-amber-100 text-amber-800"
                        : track.status === "ACEPTADA"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {track.status === "EN_REVISION" ? "⏱️ En revisión" : track.status === "ACEPTADA" ? "✅ Aceptada" : "❌ Rechazada"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
