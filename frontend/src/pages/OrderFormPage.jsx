import { ArrowLeft, ChevronDown, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";
import { productVariationLabel } from "../utils/jobFormatters.js";

const emptyItemDraft = {
  product_id: "",
  quantity: 1,
};

export default function OrderFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [itemDraft, setItemDraft] = useState(emptyItemDraft);
  const [productSearch, setProductSearch] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    delivery_date: "",
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const backTo = useMemo(() => location.state?.from || "/orders", [location.state]);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      setProducts(await api.get("/products"));
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

  function addItem() {
    if (!itemDraft.product_id) {
      toast.error("Selecione um produto para adicionar.");
      return;
    }

    const product = selectedProduct(products, itemDraft.product_id);

    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          product_id: itemDraft.product_id,
          quantity: Number(itemDraft.quantity) || 1,
          product_name: product?.name || "",
          product_sku: product?.sku || "",
          variation: product ? productVariationLabel(product) : "",
        },
      ],
    }));

    setItemDraft(emptyItemDraft);
    setProductPickerOpen(false);
  }

  function removeItem(index) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function saveOrder(event) {
    event.preventDefault();

    if (form.items.length === 0) {
      toast.error("Adicione ao menos um produto ao pedido.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const order = await api.post("/orders", normalizePayload(form));
      toast.success("Pedido criado e fila gerada.");
      navigate(`/orders/${order.id}`);
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
        title="Novo pedido"
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
            <h2>Informações do pedido</h2>
          </div>
          <form onSubmit={saveOrder}>
            <div className="form-grid compact">
              <label>
                Cliente
                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={updateField}
                  required
                />
              </label>
              <label>
                Entrega
                <input
                  name="delivery_date"
                  type="date"
                  value={form.delivery_date}
                  onChange={updateField}
                  required
                />
              </label>
            </div>

            <section className="order-item-builder">
              <div className="panel-header">
                <h2>Adicionar produto</h2>
              </div>
              <div className="order-item-builder-grid">
                <label className="product-combobox-field">
                  Produto
                  <div className="product-combobox">
                    <input
                      value={productSearch}
                      onChange={(event) => {
                        setProductSearch(event.target.value);
                        setProductPickerOpen(true);
                        setItemDraft((current) => ({ ...current, product_id: "" }));
                      }}
                      onFocus={() => setProductPickerOpen(true)}
                      placeholder="Pesquise um produto"
                    />
                    <button
                      type="button"
                      aria-label="Mostrar produtos"
                      title="Mostrar produtos"
                      onClick={() => setProductPickerOpen((current) => !current)}
                    >
                      <ChevronDown size={18} />
                    </button>
                    {productPickerOpen ? (
                      <div className="product-combobox-menu">
                        {filteredProducts(products, productSearch).map((product) => (
                          <button
                            type="button"
                            key={product.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setItemDraft((current) => ({
                                ...current,
                                product_id: product.id,
                              }));
                              setProductSearch(productLabel(product));
                              setProductPickerOpen(false);
                            }}
                          >
                            <strong>{product.name}</strong>
                            <span>{productVariationLabel(product) || product.sku || "-"}</span>
                          </button>
                        ))}
                        {filteredProducts(products, productSearch).length === 0 ? (
                          <span className="product-combobox-empty">
                            Nenhum produto encontrado
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </label>
                <label>
                  Quantidade
                  <input
                    type="number"
                    min="1"
                    value={itemDraft.quantity}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  className="icon-button"
                  type="button"
                  title="Adicionar produto"
                  aria-label="Adicionar produto"
                  onClick={addItem}
                >
                  <Plus size={18} />
                </button>
              </div>
            </section>

            <section className="order-items-list">
              <div className="panel-header">
                <h2>Produtos do pedido</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Variação</th>
                      <th>Quantidade</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, index) => (
                      <tr key={`${item.product_id}-${index}`}>
                        <td>
                          <strong>{item.product_name}</strong>
                          <span className="muted">{item.product_sku || "-"}</span>
                        </td>
                        <td>{item.variation || "-"}</td>
                        <td>{item.quantity}</td>
                        <td>
                          <button
                            className="icon-button danger"
                            type="button"
                            title="Remover item"
                            aria-label="Remover item"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <StatusMessage empty={form.items.length === 0} />
              </div>
            </section>

            <div className="form-actions job-editor-actions order-form-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                <Save size={18} />
                {saving ? "Salvando..." : "Criar pedido"}
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
    customer_name: form.customer_name,
    delivery_date: form.delivery_date,
    items: form.items.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
    })),
  };
}

function productLabel(product) {
  const sku = product.sku ? ` - ${product.sku}` : "";
  const variation = productVariationLabel(product);
  return `${product.name}${sku}${variation ? ` - ${variation}` : ""}`;
}

function selectedProduct(products, productId) {
  return products.find((product) => String(product.id) === String(productId));
}

function filteredProducts(products, search) {
  const term = search.trim().toLowerCase();

  if (!term) {
    return products;
  }

  return products.filter((product) =>
    [
      product.name,
      product.sku,
      product.filament_brand,
      product.filament_material,
      product.filament_color,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)),
  );
}
