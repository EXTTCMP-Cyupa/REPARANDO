import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { uploadImage, submitDiagnostic } from "../../lib/api";
import { Camera, Loader } from "lucide-react";

type DiagnosticProps = {
  workOrderId: string;
  onSuccess: () => void;
};

export function DiagnosticView({ workOrderId, onSuccess }: DiagnosticProps) {
  const { session } = useAuth();
  const [summary, setSummary] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
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

  const onSubmit = async () => {
    if (!session || !summary.trim() || photos.length === 0) {
      setError("Completa el resumen y agrega al menos una foto");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await submitDiagnostic(workOrderId, { summary, photoUrls: photos }, session.accessToken);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar diagnóstico");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="card">
      <p className="badge mb-4">Diagnóstico - Registra los hallazgos iniciales</p>

      <label className="mb-2 block text-sm font-semibold">Resumen de hallazgos</label>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="mb-4 w-full rounded-lg border border-brand-200 bg-white px-3 py-2"
        placeholder="Describe qué encontraste al inspeccionar..."
        rows={4}
      />

      <div className="mb-4">
        <p className="mb-2 text-sm font-semibold">Fotos de evidencia ({photos.length})</p>
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
        onClick={onSubmit}
        disabled={loading || uploadingPhoto || !summary.trim() || photos.length === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-bold text-brand-50 disabled:opacity-60"
      >
        {loading ? <Loader size={16} className="animate-spin" /> : null}
        {loading ? "Enviando..." : "Enviar Diagnóstico"}
      </button>
    </article>
  );
}
