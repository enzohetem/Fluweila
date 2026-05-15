import { ArrowLeft, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { PRINTER_STATUSES } from "../constants.js";
import { useToast } from "../feedback/ToastProvider.jsx";

const emptyForm = {
  name: "",
  model: "",
  status: "available",
};

export default function PrinterFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(id);
  const backTo = useMemo(() => location.state?.from || "/printers", [location.state]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      if (editing) {
        const printer = await api.get(`/printers/${id}`);
        setForm({
          name: printer.name || "",
          model: printer.model || "",
          status: printer.status || "available",
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

  async function savePrinter(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await api.put(`/printers/${id}`, form);
        toast.success("Impressora atualizada.");
      } else {
        await api.post("/printers", form);
        toast.success("Impressora cadastrada.");
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
        title={editing ? "Editar impressora" : "Nova impressora"}
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
            <h2>Informações da impressora</h2>
          </div>
          <form className="form-grid compact" onSubmit={savePrinter}>
            <label>
              Nome
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
            <label>
              Modelo
              <input name="model" value={form.model} onChange={updateField} />
            </label>
            <SelectField
              label="Status"
              value={form.status}
              options={PRINTER_STATUSES}
              onChange={(value) => setForm((current) => ({ ...current, status: value }))}
            />
            <div className="form-actions job-editor-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                {editing ? <Save size={18} /> : <Plus size={18} />}
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar impressora"}
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
