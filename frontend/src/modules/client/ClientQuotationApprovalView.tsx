import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getQuotation, approveQuotation } from "../../lib/api";
import { Check, Loader, X } from "lucide-react";

type ClientQuotationApprovalProps = {
  workOrderId: string;
  onSuccess: () => void;
};

export function ClientQuotationApprovalView({ workOrderId, onSuccess }: ClientQuotationApprovalProps) {
  const { session } = useAuth();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    getQuotation(workOrderId, session.accessToken)
      .then((data) => {
        setQuotation(data);
        setError(null);
      })
      .catch(() => {
        setError("No fue posible cargar la cotización");
      })
      .finally(() => setLoading(false));
  }, [session, workOrderId]);

  const handleApprove = async () => {
    if (!session) return;

    try {
      setApproving(true);
      setError(null);
      await approveQuotation(workOrderId, session.user.userId, session.accessToken);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aprobar cotización");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <article className="card">
        <div className="flex items-center justify-center gap-2">
          <Loader size={16} className="animate-spin" />
          <p>Cargando cotización...</p>
        </div>
      </article>
    );
  }

  if (!quotation) {
    return (
      <article className="card">
        <p className="badge mb-4 bg-yellow-100 text-yellow-700">Sin cotización</p>
        <p>El técnico aún no ha enviado la cotización. Espera un poco más...</p>
      </article>
    );
  }

  const laborCost = quotation.quotationLaborCost || 0;
  const materialsCost = quotation.quotationMaterialsCost || 0;
  const total = laborCost + materialsCost;
  const alreadyApproved = !!quotation.clientApprovalDate || quotation.status === "EN_PROCESO" || quotation.status === "FINALIZADO";

  return (
    <article className="card">
      <p className="badge mb-4">Cotización - Revisa y aprueba el presupuesto</p>

      <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
        <h3 className="mb-3 font-bold">Desglose de la cotización</h3>

        <div className="mb-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Mano de Obra:</span>
            <span className="font-bold">${laborCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Materiales:</span>
            <span className="font-bold">${materialsCost.toFixed(2)}</span>
          </div>
          <div className="border-t border-brand-200 pt-2 font-bold">
            <div className="flex justify-between text-base">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {quotation.quotationItems && quotation.quotationItems.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-bold text-sm">Detalle de Materiales:</p>
            {quotation.quotationItems.map((item: any, idx: number) => (
              <div key={idx} className="text-xs text-brand-700">
                • {item.name} - {item.quantity} {item.unit} x ${item.unitPrice.toFixed(2)} = ${item.totalPrice.toFixed(2)}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

      {alreadyApproved ? (
        <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">
          Esta cotización ya fue aprobada. La orden está en ejecución.
        </p>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 hover:bg-green-700"
          >
            {approving ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
            {approving ? "Aprobando..." : "Aprobar Cotización"}
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200">
            <X size={16} />
            Rechazar
          </button>
        </div>
      )}
    </article>
  );
}
