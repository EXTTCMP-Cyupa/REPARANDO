import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { uploadImage, addWorkNote } from "../../lib/api";
import { Camera, Loader } from "lucide-react";

type WorkNoteViewProps = {
  workOrderId: string;
  onSuccess: () => void;
};

export function WorkNoteView({ workOrderId, onSuccess }: WorkNoteViewProps) {
  const { session } = useAuth();
  const [description, setDescription] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
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
    if (!session || !description.trim() || !additionalCost) {
      setError("Completa la descripción y el costo adicional");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await addWorkNote(
        workOrderId,
        {
          description,
          additionalCost: parseFloat(additionalCost),
          evidencePhotos: photos.join(",")
        },
        session.accessToken
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar nota");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-1 text-lg font-extrabold text-slate-900">Agregar Nota de Trabajo (Adicional)</p>
      <p className="mb-4 text-sm text-slate-600">Reporta novedades o correcciones con evidencia y costo extra.</p>

      <label className="mb-2 block text-sm font-semibold text-slate-700">Descripción del imprevisto</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
        placeholder="Describe qué imprevisto surgió durante la ejecución..."
        rows={3}
      />

      <label className="mb-2 block text-sm font-semibold text-slate-700">Costo extra (extra)</label>
      <input
        value={additionalCost}
        onChange={(e) => setAdditionalCost(e.target.value)}
        type="number"
        step="0.01"
        className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
        placeholder="0.00"
      />

      <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold">Subir evidencia con foto ({photos.length})</p>
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
        <label className="inline-flex items-center gap-2 rounded-xl bg-brand-100 px-3 py-2 text-sm font-bold text-brand-900 hover:bg-brand-200">
          <Camera size={16} />
          {uploadingPhoto ? "Subiendo..." : "Agregar foto"}
          <input type="file" accept="image/*" onChange={onAddPhoto} disabled={uploadingPhoto} className="hidden" />
        </label>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={loading || uploadingPhoto || !description.trim() || !additionalCost}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? <Loader size={16} className="animate-spin" /> : null}
        {loading ? "Enviando..." : "Enviar Nota al Cliente"}
      </button>
    </article>
  );
}
