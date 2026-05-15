import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { useConfirm } from "../feedback/ConfirmProvider.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";

export default function ProductsPage() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      setProducts(await api.get(`/products?${params.toString()}`));
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(product) {
    const confirmed = await confirm({
      title: "Remover produto",
      message: `Deseja remover ${product.name}?`,
      confirmLabel: "Remover",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(product.id);
      setError("");
      await api.delete(`/products/${product.id}`);
      toast.success("Produto removido.");
      await loadProducts();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    loadProducts();
  }

  return (
    <section className="page">
      <PageHeader
        title="Produtos"
        actions={
          <Link className="primary-button" to="/products/new">
            <Plus size={18} />
            Novo produto
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Lista de produtos</h2>
          <form className="toolbar" onSubmit={submitSearch}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto, SKU ou variação"
            />
            <button
              className="icon-button"
              type="submit"
              title="Atualizar"
              aria-label="Atualizar"
            >
              <RefreshCw size={18} />
            </button>
          </form>
        </div>
        <StatusMessage loading={loading} error={error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Variação</th>
                <th>Tempo estimado</th>
                <th>Filamento estimado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong></td>
                  <td>{product.sku || "-"}</td>
                  <td>{product.filament_id ? filamentLabel(product) : "-"}</td>
                  <td>
                    <Badge tone={product.estimated_time_minutes > 0 ? "info" : "warning"}>
                      {product.estimated_time_minutes || 0} min
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={product.estimated_filament_grams > 0 ? "success" : "warning"}>
                      {product.estimated_filament_grams || 0} g
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="secondary-button compact-button"
                        to={`/products/${product.id}/edit`}
                        state={{ from: location.pathname }}
                      >
                        <Edit3 size={16} />
                        Editar
                      </Link>
                      <button
                        className="icon-button danger"
                        type="button"
                        title="Remover"
                        aria-label="Remover"
                        disabled={busyId === product.id}
                        onClick={() => deleteProduct(product)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <StatusMessage empty={!loading && products.length === 0} />
        </div>
      </section>
    </section>
  );
}

function filamentLabel(item) {
  const brand = item.filament_brand || item.brand;
  const material = item.filament_material || item.material;
  const color = item.filament_color || item.color;

  return [brand, material, color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ");
}
