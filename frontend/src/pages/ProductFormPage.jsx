import { ArrowLeft, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";

const emptyForm = {
  name: "",
  sku: "",
  filament_id: "",
  estimated_time_minutes: 0,
  estimated_filament_grams: 0,
};

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [filaments, setFilaments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(id);
  const backTo = useMemo(() => location.state?.from || "/products", [location.state]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [filamentList, product] = await Promise.all([
        api.get("/filaments"),
        editing ? api.get(`/products/${id}`) : Promise.resolve(null),
      ]);

      setFilaments(filamentList);

      if (product) {
        setForm({
          name: product.name || "",
          sku: product.sku || "",
          filament_id: product.filament_id || "",
          estimated_time_minutes: product.estimated_time_minutes || 0,
          estimated_filament_grams: product.estimated_filament_grams || 0,
        });
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveProduct(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const payload = normalizePayload(form);

      if (editing) {
        await api.put(`/products/${id}`, payload);
        toast.success("Produto atualizado.");
      } else {
        await api.post("/products", payload);
        toast.success("Produto cadastrado.");
      }

      navigate(backTo);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page detail-page">
      <PageHeader
        title={editing ? "Editar produto" : "Novo produto"}
        actions={
          <button className="secondary-button" type="button" onClick={() => navigate(backTo)}>
            <ArrowLeft size={18} />
            Voltar
          </button>
        }
      />

      <StatusMessage loading={loading} error={error} />

      {!loading ? (
        <section className="panel job-editor-panel">
          <div className="panel-header">
            <h2>Informações do produto</h2>
          </div>
          <form className="form-grid compact" onSubmit={saveProduct}>
            <label>
              Nome do produto
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
            <label>
              SKU
              <input name="sku" value={form.sku} onChange={updateField} />
            </label>
            <SelectField
              label="Variação"
              value={form.filament_id}
              placeholder="Sem variação"
              options={[
                { value: "", label: "Sem variação" },
                ...filaments.map((filament) => ({
                  value: filament.id,
                  label: filamentLabel(filament),
                })),
              ]}
              onChange={(value) =>
                setForm((current) => ({ ...current, filament_id: value }))
              }
            />
            <label>
              Tempo estimado
              <span className="unit-input">
                <input
                  name="estimated_time_minutes"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.estimated_time_minutes}
                  onChange={updateField}
                />
                <span>min</span>
              </span>
            </label>
            <label>
              Filamento estimado
              <span className="unit-input">
                <input
                  name="estimated_filament_grams"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.estimated_filament_grams}
                  onChange={updateField}
                />
                <span>g</span>
              </span>
            </label>
            <div className="form-actions job-editor-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                {editing ? <Save size={18} /> : <Plus size={18} />}
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar produto"}
              </button>
              <button className="secondary-button" type="button" onClick={() => navigate(backTo)}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </section>
  );
}

function normalizePayload(form) {
  return {
    ...form,
    filament_id: form.filament_id === "" ? null : Number(form.filament_id),
    estimated_time_minutes: Number(form.estimated_time_minutes),
    estimated_filament_grams: Number(form.estimated_filament_grams),
  };
}

function filamentLabel(item) {
  return [item.brand, item.material, item.color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ");
}
