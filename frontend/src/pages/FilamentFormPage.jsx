import { ArrowLeft, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { FILAMENT_MATERIALS } from "../constants.js";
import { useToast } from "../feedback/ToastProvider.jsx";

const emptyForm = {
  brand: "",
  color: "",
  material: "PLA",
  stock_grams: 0,
};

export default function FilamentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(id);
  const backTo = useMemo(() => location.state?.from || "/filaments", [location.state]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      if (editing) {
        const filament = await api.get(`/filaments/${id}`);
        setForm({
          brand: filament.brand || "",
          color: filament.color || "",
          material: filament.material || "PLA",
          stock_grams: filament.stock_grams || 0,
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

  async function saveFilament(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        name: buildFilamentName(form),
        stock_grams: Number(form.stock_grams),
      };

      if (editing) {
        await api.put(`/filaments/${id}`, payload);
        toast.success("Filamento atualizado.");
      } else {
        await api.post("/filaments", payload);
        toast.success("Filamento cadastrado.");
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
        title={editing ? "Editar filamento" : "Novo filamento"}
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
            <h2>Informações do filamento</h2>
          </div>
          <form className="form-grid compact" onSubmit={saveFilament}>
            <label>
              Marca
              <input name="brand" value={form.brand} onChange={updateField} />
            </label>
            <label>
              Cor
              <input name="color" value={form.color} onChange={updateField} required />
            </label>
            <label>
              Estoque
              <span className="unit-input">
                <input
                  name="stock_grams"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.stock_grams}
                  onChange={updateField}
                />
                <span>g</span>
              </span>
            </label>
            <SelectField
              label="Material"
              value={form.material}
              options={FILAMENT_MATERIALS.map((material) => ({
                value: material,
                label: material,
              }))}
              onChange={(value) => setForm((current) => ({ ...current, material: value }))}
            />
            <div className="form-actions job-editor-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                {editing ? <Save size={18} /> : <Plus size={18} />}
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar filamento"}
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

function buildFilamentName(form) {
  return [form.brand, form.material, form.color]
    .filter((value) => value && String(value).trim() !== "")
    .map((value) => String(value).trim())
    .join(" ");
}
