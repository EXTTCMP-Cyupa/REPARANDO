import { BadgeCheck, Bolt, Clock3, Droplets, Hammer, Paintbrush, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { contactMarketplaceProfessional, getBusinessPolicy, searchMarketplaceProfessionals } from "../../lib/api";

type Professional = {
  workerId: string;
  fullName: string;
  category: string;
  rating: number;
  latitude: number;
  longitude: number;
  portfolioImages: string[];
};

const categories = [
  { label: "Pintor", value: "PINTOR", icon: Paintbrush },
  { label: "Electricista", value: "ELECTRICISTA", icon: Bolt },
  { label: "Plomero", value: "PLOMERO", icon: Droplets },
  { label: "Relojero", value: "RELOJERO", icon: Clock3 },
  { label: "Carpintero", value: "CARPINTERO", icon: Hammer }
];

function DemoGallery({ images }: { images: string[] }) {
  if (images.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {["Antes", "Después", "Detalle"].map((label) => (
          <div key={label} className="h-20 rounded-lg border border-slate-200 bg-slate-100 p-2 text-[11px] font-bold text-slate-500">
            {label}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.slice(0, 6).map((src, index) => (
        <img key={`${src}-${index}`} src={src} alt="Trabajo previo" className="h-20 w-full rounded-lg border border-slate-200 object-cover" />
      ))}
    </div>
  );
}

export function MarketplaceView() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [minRating, setMinRating] = useState("4");
  const [results, setResults] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [contactingWorkerId, setContactingWorkerId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [leadCost, setLeadCost] = useState<number>(1.5);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(null);
  const [draftDescriptionByWorker, setDraftDescriptionByWorker] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session) return;
    getBusinessPolicy(session.accessToken)
      .then((policy) => setLeadCost(Number(policy.leadCost)))
      .catch(() => setLeadCost(1.5));
  }, [session]);

  const runSearch = () => {
    if (!session) return;

    const parsedMinRating = minRating.trim() ? Number(minRating) : undefined;
    if (parsedMinRating !== undefined && (!Number.isFinite(parsedMinRating) || parsedMinRating < 0 || parsedMinRating > 5)) {
      setError("Estrellas mínimas debe estar entre 0 y 5.");
      return;
    }

    setHasSearched(true);
    setLoading(true);
    setError(null);

    searchMarketplaceProfessionals(
      {
        category: category.trim() || undefined,
        minRating: parsedMinRating
      },
      session.accessToken
    )
      .then((items) => {
        const byQuery = query.trim()
          ? items.filter((item) => `${item.fullName} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()))
          : items;
        setResults(byQuery);
      })
      .catch(() => {
        setResults([]);
        setError("No fue posible cargar profesionales.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    runSearch();
  }, [session]);

  const highlightedResult = useMemo(() => results[0] ?? null, [results]);

  const onContactProfessional = async (profile: Professional) => {
    if (!session) return;

    const description = (draftDescriptionByWorker[profile.workerId] ?? "").trim();

    if (!description) {
      setContactMessage("Describe el trabajo antes de solicitar presupuesto.");
      return;
    }

    try {
      setContactingWorkerId(profile.workerId);
      setContactMessage(null);
      const createdOrder = await contactMarketplaceProfessional(
        {
          clientId: session.user.userId,
          workerId: profile.workerId,
          description,
          category: category.trim() || profile.category
        },
        session.accessToken
      );

      setLastCreatedOrderId(createdOrder.id);
      setContactMessage(`Presupuesto solicitado. Se creó la orden #${createdOrder.id.slice(0, 8)}.`);
      setDraftDescriptionByWorker((current) => ({ ...current, [profile.workerId]: "" }));
    } catch (e) {
      if (e instanceof Error) {
        setContactMessage(e.message);
      } else {
        setContactMessage("No fue posible solicitar presupuesto.");
      }
    } finally {
      setContactingWorkerId(null);
    }
  };

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xl font-extrabold text-slate-900">Marketplace de Profesionales (Cliente)</p>
        <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-900">Lead por contacto: ${leadCost.toFixed(2)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_140px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
              placeholder="Buscar por profesional o categoría"
            />
          </label>
          <input
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Mínimo estrellas"
          />
          <button onClick={runSearch} disabled={loading} className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => {
            const Icon = item.icon;
            const active = category === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setCategory((current) => (current === item.value ? "" : item.value))}
                className={
                  "inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition " +
                  (active ? "border-brand-500 bg-brand-50 text-brand-900" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-200")
                }
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      {contactMessage && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-900">{contactMessage}</p>}
      {lastCreatedOrderId && (
        <button onClick={() => navigate("/client")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
          Ir a mis trabajos
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {!hasSearched && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Usa filtros para comenzar.</p>}
          {hasSearched && results.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Sin resultados.</p>}

          {results.map((profile) => (
            <article key={profile.workerId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 rounded-xl bg-brand-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold text-slate-900">{profile.fullName}</p>
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    <BadgeCheck size={14} />
                    Verificado (Check Azul)
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
                    <Star size={14} fill="currentColor" />
                    {profile.rating.toFixed(1)} Estrellas
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-sm font-bold text-slate-900">Trabajos Previos (Antes/Después)</p>
                <DemoGallery images={profile.portfolioImages} />
                <p className="mt-2 text-xs font-semibold text-slate-600">Encuentra trabajadores reales y seguros</p>
              </div>

              <textarea
                value={draftDescriptionByWorker[profile.workerId] ?? ""}
                onChange={(event) =>
                  setDraftDescriptionByWorker((current) => ({ ...current, [profile.workerId]: event.target.value }))
                }
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="Describe el trabajo que necesitas"
              />

              <button
                onClick={() => onContactProfessional(profile)}
                disabled={contactingWorkerId === profile.workerId}
                className="mt-3 rounded-xl bg-brand-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {contactingWorkerId === profile.workerId ? "Solicitando..." : "Solicitar Presupuesto"}
              </button>
            </article>
          ))}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">Profesional destacado</p>
          {!highlightedResult ? (
            <p className="mt-2 text-sm text-slate-600">Sin profesional destacado aún.</p>
          ) : (
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <p className="font-extrabold text-slate-900">{highlightedResult.fullName}</p>
              <p className="text-xs text-slate-600">Categoría: {highlightedResult.category}</p>
              <p className="text-xs text-slate-600">Zona referencial: Quito</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
