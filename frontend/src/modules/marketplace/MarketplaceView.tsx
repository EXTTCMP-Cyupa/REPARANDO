import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { searchMarketplaceProfessionals } from "../../lib/api";

type Professional = {
  workerId: string;
  fullName: string;
  category: string;
  rating: number;
  latitude: number;
  longitude: number;
  portfolioImages: string[];
};

export function MarketplaceView() {
  const { session } = useAuth();
  const [category, setCategory] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [results, setResults] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = () => {
    if (!session) return;

    const parsedMinRating = minRating.trim() ? Number(minRating) : undefined;
    const parsedMaxKm = maxKm.trim() ? Number(maxKm) : undefined;
    if (parsedMinRating !== undefined && (!Number.isFinite(parsedMinRating) || parsedMinRating < 0 || parsedMinRating > 5)) {
      setError("Estrellas mínimas debe estar entre 0 y 5.");
      return;
    }
    if (parsedMaxKm !== undefined && (!Number.isFinite(parsedMaxKm) || parsedMaxKm <= 0)) {
      setError("Distancia máxima debe ser mayor a 0.");
      return;
    }

    setHasSearched(true);
    setLoading(true);
    setError(null);

    searchMarketplaceProfessionals(
      {
        category: category.trim() || undefined,
        minRating: parsedMinRating,
        maxKm: parsedMaxKm
      },
      session.accessToken
    )
      .then((items) => setResults(items))
      .catch(() => {
        setResults([]);
        setError("No fue posible cargar profesionales.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <section className="card">
      <p className="badge mb-4">Escenario A: Marketplace</p>
      <div
        className="grid gap-3 md:grid-cols-3"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            runSearch();
          }
        }}
      >
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2"
          placeholder="Categoría"
        />
        <input
          value={minRating}
          onChange={(event) => setMinRating(event.target.value)}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2"
          placeholder="Estrellas mínimas"
        />
        <input
          value={maxKm}
          onChange={(event) => setMaxKm(event.target.value)}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2"
          placeholder="Distancia máxima (km)"
        />
      </div>
      <button
        onClick={runSearch}
        disabled={loading}
        className="mt-3 rounded-lg bg-brand-900 px-4 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
      >
        {loading ? "Buscando..." : "Buscar profesionales"}
      </button>

      {error && <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-4 space-y-3">
        {!hasSearched && (
          <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
            Ajusta filtros opcionales y presiona buscar para ver profesionales.
          </p>
        )}

        {hasSearched && results.length === 0 && <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm">Sin resultados.</p>}

        {results.map((profile) => (
          <article key={profile.workerId} className="rounded-xl border border-brand-100 bg-white p-4">
            <p className="font-bold">{profile.fullName}</p>
            <p className="text-sm">Categoría: {profile.category}</p>
            <p className="text-sm">Rating: {profile.rating.toFixed(1)}</p>
            <p className="text-sm">Ubicación: {profile.latitude}, {profile.longitude}</p>
            <p className="text-sm">Portafolio: {profile.portfolioImages.join(", ") || "Sin imágenes"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
