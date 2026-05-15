import { ArrowLeft, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { PRINTER_STATUSES, labelFor } from "../constants.js";
import { useToast } from "../feedback/ToastProvider.jsx";
import { productVariationLabel } from "../utils/jobFormatters.js";

const emptyForm = {
  customer_name: "",
  product_id: "",
  delivery_date: "",
  estimated_time_minutes: "",
  estimated_filament_grams: "",
  printer_id: "",
};

export default function JobFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [printers, setPrinters] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = Boolean(id);
  const backTo = useMemo(() => location.state?.from || "/jobs", [location.state]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [printerList, productList, job] = await Promise.all([
        api.get("/printers"),
        api.get("/products"),
        editing ? api.get(`/jobs/${id}`) : Promise.resolve(null),
      ]);

      setPrinters(printerList);
      setProducts(productList);

      if (job) {
        setForm({
          customer_name: job.customer_name || job.title || "",
          product_id: job.product_id || "",
          delivery_date: job.delivery_date || "",
          estimated_time_minutes: job.estimated_time_minutes || "",
          estimated_filament_grams: job.estimated_filament_grams || "",
          printer_id: job.printer_id || "",
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

  function handleProductChange(value) {
    const product = products.find((item) => String(item.id) === String(value));

    setForm((current) => ({
      ...current,
      product_id: value,
      estimated_time_minutes: product?.estimated_time_minutes ?? "",
      estimated_filament_grams: product?.estimated_filament_grams ?? "",
    }));
  }

  async function saveJob(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const payload = normalizeJobPayload(form, products);

      if (editing) {
        await api.put(`/jobs/${id}`, payload);
        toast.success("Pedido atualizado.");
        navigate(backTo);
      } else {
        await api.post("/jobs", payload);
        toast.success("Pedido adicionado à fila.");
        navigate("/jobs");
      }
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
        title={editing ? "Editar pedido" : "Novo pedido"}
        actions={(
          <button className="secondary-button" type="button" onClick={() => navigate(backTo)}>
            <ArrowLeft size={18} />
            Voltar
          </button>
        )}
      />

      <StatusMessage loading={loading} error={error} />

      {!loading ? (
        <section className="panel job-editor-panel">
          <div className="panel-header">
            <h2>Informações do pedido</h2>
          </div>
          <form className="form-grid job-editor-grid" onSubmit={saveJob}>
            <label>
              Cliente
              <input name="customer_name" value={form.customer_name} onChange={updateField} required />
            </label>
            <SelectField
              label="Produto"
              value={form.product_id}
              placeholder="Selecione um produto"
              options={[
                { value: "", label: "Selecione um produto" },
                ...products.map((product) => ({
                  value: product.id,
                  label: productLabel(product),
                })),
              ]}
              onChange={handleProductChange}
            />
            <SelectField
              label="Impressora"
              value={form.printer_id}
              placeholder="Sem impressora"
              options={[
                { value: "", label: "Sem impressora" },
                ...printers.map((printer) => ({
                  value: printer.id,
                  label: `${printer.name} · ${labelFor(PRINTER_STATUSES, printer.status)}`,
                })),
              ]}
              onChange={(value) => setForm((current) => ({ ...current, printer_id: value }))}
            />
            <label>
              Entrega
              <input name="delivery_date" type="date" value={form.delivery_date} onChange={updateField} required />
            </label>
            <label>
              Tempo estimado
              <span className="unit-input">
                <input
                  name="estimated_time_minutes"
                  type="number"
                  min="0"
                  value={form.estimated_time_minutes}
                  readOnly
                  disabled
                  title="Preenchido automaticamente pelo produto selecionado"
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
                  value={form.estimated_filament_grams}
                  readOnly
                  disabled
                  title="Preenchido automaticamente pelo produto selecionado"
                />
                <span>g</span>
              </span>
            </label>
            <div className="form-actions job-editor-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                {editing ? <Save size={18} /> : <Plus size={18} />}
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar à fila"}
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

function normalizeJobPayload(form, products) {
  const product = products.find((item) => String(item.id) === String(form.product_id));

  return {
    ...form,
    title: form.customer_name,
    file_name: product?.name || null,
    estimated_time_minutes: form.estimated_time_minutes === "" ? null : Number(form.estimated_time_minutes),
    estimated_filament_grams: form.estimated_filament_grams === "" ? null : Number(form.estimated_filament_grams),
    printer_id: form.printer_id === "" ? null : Number(form.printer_id),
    product_id: form.product_id === "" ? null : Number(form.product_id),
    filament_id: product?.filament_id ? Number(product.filament_id) : null,
  };
}

function productLabel(product) {
  const sku = product.sku ? ` · ${product.sku}` : "";
  const variation = productVariationLabel(product);
  return `${product.name}${sku}${variation ? ` · ${variation}` : ""}`;
}
