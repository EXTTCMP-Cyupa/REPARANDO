import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { submitQuotation } from "../../lib/api";
import { Loader, Plus, Trash2 } from "lucide-react";

type QuotationViewProps = {
  workOrderId: string;
  workerId: string;
  onSuccess: () => void;
};

type QuotationItemInput = {
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export function QuotationView({ workOrderId, workerId, onSuccess }: QuotationViewProps) {
  const { session } = useAuth();
  const [laborCost, setLaborCost] = useState("");
  const [materialsCost, setMaterialsCost] = useState("");
  const [items, setItems] = useState<QuotationItemInput[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemUnit, setItemUnit] = useState("unidad");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    if (!itemName.trim() || !itemPrice) {
      setError("Completa nombre y precio del material");
      return;
    }
    const newItem: QuotationItemInput = {
      name: itemName.trim(),
      unit: itemUnit,
      quantity: parseInt(itemQuantity) || 1,
      unitPrice: parseFloat(itemPrice) || 0
    };
    setItems((current) => [...current, newItem]);
    setItemName("");
    setItemPrice("");
    setItemQuantity("1");
    setError(null);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    if (!session || !laborCost || !materialsCost || items.length === 0) {
      setError("Completa mano de obra, materiales y detalle de items");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const quotationItems = items.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice
      }));

      await submitQuotation(
        workOrderId,
        {
          workerId,
          laborCost: parseFloat(laborCost),
          materialsCost: parseFloat(materialsCost),
          items: quotationItems
        },
        session.accessToken
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar cotización");
    } finally {
      setLoading(false);
    }
  };

  const totalMaterials = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalLabor = parseFloat(laborCost) || 0;
  const totalQuotation = totalLabor + totalMaterials;

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-1 text-lg font-extrabold text-slate-900">Cotización Detallada</p>
      <p className="mb-4 text-sm text-slate-600">Define mano de obra, materiales y total para enviar al cliente.</p>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Mano de Obra ($)</label>
          <input
            value={laborCost}
            onChange={(e) => setLaborCost(e.target.value)}
            type="number"
            step="0.01"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Materiales ($)</label>
          <input
            value={materialsCost}
            onChange={(e) => setMaterialsCost(e.target.value)}
            type="number"
            step="0.01"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 font-bold text-slate-900">Agregar Ítem</p>
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            placeholder="Material"
          />
          <select value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
            <option>unidad</option>
            <option>metro</option>
            <option>litro</option>
            <option>gramo</option>
            <option>otro</option>
          </select>
          <input
            value={itemQuantity}
            onChange={(e) => setItemQuantity(e.target.value)}
            type="number"
            min="1"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            placeholder="Cantidad"
          />
          <input
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            type="number"
            step="0.01"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            placeholder="Precio unitario"
          />
          <button
            onClick={addItem}
            className="inline-flex items-center justify-center rounded-lg bg-brand-900 px-2 py-1 text-sm font-bold text-white"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-bold">Ítem</th>
                <th className="px-3 py-2 font-bold">Descripción</th>
                <th className="px-3 py-2 font-bold">Precio</th>
                <th className="px-3 py-2 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr>
                <td className="px-3 py-2 font-semibold">Mano de Obra</td>
                <td className="px-3 py-2 text-slate-600">Servicio técnico profesional</td>
                <td className="px-3 py-2 font-semibold">${totalLabor.toFixed(2)}</td>
                <td className="px-3 py-2" />
              </tr>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 font-semibold">Material</td>
                  <td className="px-3 py-2 text-slate-600">{item.name} ({item.quantity} {item.unit})</td>
                  <td className="px-3 py-2 font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-700">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center text-slate-500">Aún no agregaste materiales.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
        <p>Materiales: ${totalMaterials.toFixed(2)}</p>
        <p className="mt-2 border-t border-emerald-200 pt-2 text-base">Total: ${totalQuotation.toFixed(2)}</p>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={loading || !laborCost || !materialsCost || items.length === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? <Loader size={16} className="animate-spin" /> : null}
        {loading ? "Enviando..." : "Enviar Cotización al Cliente"}
      </button>
    </article>
  );
}
