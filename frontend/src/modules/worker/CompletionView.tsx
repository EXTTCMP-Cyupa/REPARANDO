import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { uploadImage, completeWork, submitRating } from "../../lib/api";
import { Camera, Loader, Star } from "lucide-react";

type CompletionViewProps = {
  workOrderId: string;
  onSuccess: () => void;
};

export function CompletionView({ workOrderId, onSuccess }: CompletionViewProps) {
  const { session } = useAuth();
  const [step, setStep] = useState<"completion" | "rating">("completion");
  const [photos, setPhotos] = useState<string[]>([]);
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onAddPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session || !event.target.files?.[0]) return;

    try {
      setUploadingPhoto(true);
      setError(null);
      const file = event.target.files[0];
      const result = await uploadImage(file, session.accessToken);
      setPhotos((current) => [...current, result.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onCompleteWork = async () => {
    if (!session || photos.length === 0) {
      setError("Agrega al menos una foto del trabajo terminado");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await completeWork(workOrderId, { completionPhotos: photos }, session.accessToken);
      setStep("rating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al completar trabajo");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitRating = async () => {
    if (!session || !rating) {
      setError("Selecciona una calificación");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await submitRating(workOrderId, { rating: parseFloat(rating), review }, session.accessToken);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar calificación");
    } finally {
      setLoading(false);
    }
  };

  if (step === "completion") {
    return (
      <article className="card">
        <p className="badge mb-4">Completación - Fotografia del trabajo finalizado</p>

        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold">Fotos del resultado ({photos.length})</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {photos.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Photo ${idx}`}
                className="h-20 w-20 rounded-lg border border-brand-200 object-cover"
              />
            ))}
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-2 text-sm font-bold text-brand-900 hover:bg-brand-200">
            <Camera size={16} />
            {uploadingPhoto ? "Subiendo..." : "Agregar foto"}
            <input type="file" accept="image/*" onChange={onAddPhoto} disabled={uploadingPhoto} className="hidden" />
          </label>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

        <button
          onClick={onCompleteWork}
          disabled={loading || uploadingPhoto || photos.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
        >
          {loading ? <Loader size={16} className="animate-spin" /> : null}
          {loading ? "Completando..." : "Marcar como Completado"}
        </button>
      </article>
    );
  }

  return (
    <article className="card">
      <p className="badge mb-4">Calificación del Cliente - Tu desempeño en este trabajo</p>

      <div className="mb-4">
        <p className="mb-2 text-sm font-semibold">Calificación (Estrellas)</p>
        <div className="mb-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(String(star))}
              className={`rounded-lg px-3 py-2 font-bold transition ${
                parseInt(rating) >= star ? "bg-brand-900 text-brand-50" : "bg-brand-100 text-brand-900"
              }`}
            >
              <Star size={16} fill="currentColor" />
            </button>
          ))}
        </div>
        <p className="text-sm">Calificación: {rating} / 5 estrellas</p>
      </div>

      <label className="mb-2 block text-sm font-semibold">Comentario (opcional)</label>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        className="mb-4 w-full rounded-lg border border-brand-200 bg-white px-3 py-2"
        placeholder="Comparte tu experiencia con este cliente..."
        rows={3}
      />

      {error && <p className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

      <button
        onClick={onSubmitRating}
        disabled={loading || !rating}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
      >
        {loading ? <Loader size={16} className="animate-spin" /> : null}
        {loading ? "Enviando..." : "Enviar Calificación"}
      </button>
    </article>
  );
}
