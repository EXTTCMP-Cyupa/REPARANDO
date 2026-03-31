import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { uploadImage, addWorkNote } from "../../lib/api";
import { Camera, Loader } from "lucide-react";

type WorkNoteViewProps = {
  workOrderId: string;
  notes: Array<{
    description: string;
    additionalCost: number;
    evidencePhotos: string;
    createdAt: string;
    clientApproved: boolean | null;
  }>;
  onSuccess: () => void;
};

export function WorkNoteView({ workOrderId, notes, onSuccess }: WorkNoteViewProps) {
  const { session } = useAuth();
  const [requiresApproval, setRequiresApproval] = useState(false);
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
    if (!session || !description.trim()) {
      setError("Completa la descripción de la nota");
      return;
    }

    const parsedCost = requiresApproval ? parseFloat(additionalCost || "0") : 0;
    if (requiresApproval && parsedCost <= 0) {
      setError("Para solicitar aprobación, el costo adicional debe ser mayor a 0");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await addWorkNote(
        workOrderId,
        {
          description,
          additionalCost: parsedCost,
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
      <p className="mb-1 text-lg font-extrabold text-slate-900">Agregar Nota de Trabajo</p>
      <p className="mb-4 text-sm text-slate-600">Puedes registrar una nota informativa o solicitar aprobación con costo extra.</p>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">Tipo de nota</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRequiresApproval(false);
              setAdditionalCost("");
            }}
            className={
              "rounded-lg px-3 py-2 text-sm font-bold " +
              (!requiresApproval ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border border-slate-300")
            }
          >
            Nota informativa (sin aprobación)
          </button>
          <button
            type="button"
            onClick={() => setRequiresApproval(true)}
            className={
              "rounded-lg px-3 py-2 text-sm font-bold " +
              (requiresApproval ? "bg-amber-500 text-white" : "bg-white text-slate-700 border border-slate-300")
            }
          >
            Solicitar aprobación al cliente
          </button>
        </div>
      </div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">Descripción de la nota</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
        placeholder={requiresApproval ? "Describe el imprevisto y por qué requiere aprobación..." : "Describe el avance realizado para informar al cliente..."}
        rows={3}
      />

      {requiresApproval && (
        <>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Costo extra (requiere aprobación)</label>
          <input
            value={additionalCost}
            onChange={(e) => setAdditionalCost(e.target.value)}
            type="number"
            step="0.01"
            className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            placeholder="0.00"
          />
        </>
      )}

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
        disabled={loading || uploadingPhoto || !description.trim() || (requiresApproval && !additionalCost)}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? <Loader size={16} className="animate-spin" /> : null}
        {loading ? "Enviando..." : requiresApproval ? "Enviar solicitud al cliente" : "Enviar nota informativa"}
      </button>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="mb-2 text-sm font-bold text-slate-900">Historial de notas ({notes.length})</p>
        {notes.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Aún no has creado notas para esta orden.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note, idx) => (
              <article key={`${note.createdAt}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">Nota #{idx + 1}</p>
                  <span
                    className={
                      "rounded-full px-2 py-1 text-xs font-bold " +
                      (note.clientApproved === null
                        ? "bg-amber-100 text-amber-800"
                        : note.clientApproved
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700")
                    }
                  >
                    {note.clientApproved === null ? "Pendiente" : note.clientApproved ? "Aprobada" : "Rechazada"}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{note.description}</p>
                <p className="mt-1 text-xs text-slate-600">Costo adicional: ${Number(note.additionalCost).toFixed(2)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
