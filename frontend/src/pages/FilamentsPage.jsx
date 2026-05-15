import { Edit3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { useConfirm } from "../feedback/ConfirmProvider.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";

export default function FilamentsPage() {
  const location = useLocation();
  const [filaments, setFilaments] = useState([]);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    loadFilaments();
  }, [lowStock]);

  async function loadFilaments() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (lowStock) params.set("low_stock", "true");
      setFilaments(await api.get(`/filaments?${params.toString()}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteFilament(filament) {
    const confirmed = await confirm({
      title: "Remover filamento",
      message: `Deseja remover ${filamentLabel(filament)}?`,
      confirmLabel: "Remover",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(filament.id);
      setError("");
      await api.delete(`/filaments/${filament.id}`);
      toast.success("Filamento removido.");
      await loadFilaments();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Filamentos"
        actions={
          <Link className="primary-button" to="/filaments/new">
            <Plus size={18} />
            Novo filamento
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Estoque</h2>
          <form
            className="toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              loadFilaments();
            }}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar marca, cor ou material"
            />
            <label className="check-label">
              <input
                type="checkbox"
                checked={lowStock}
                onChange={(event) => setLowStock(event.target.checked)}
              />
              Baixo estoque
            </label>
          </form>
        </div>
        <StatusMessage loading={loading} error={error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Cor</th>
                <th>Estoque (g)</th>
                <th>Material</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filaments.map((filament) => (
                <tr key={filament.id}>
                  <td><strong>{filament.brand || "-"}</strong></td>
                  <td>{filament.color}</td>
                  <td>
                    <Badge tone={filament.stock_grams <= 200 ? "warning" : "success"}>
                      {filament.stock_grams} g
                    </Badge>
                  </td>
                  <td>{filament.material}</td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="secondary-button compact-button"
                        to={`/filaments/${filament.id}/edit`}
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
                        disabled={busyId === filament.id}
                        onClick={() => deleteFilament(filament)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <StatusMessage empty={!loading && filaments.length === 0} />
        </div>
      </section>
    </section>
  );
}

function filamentLabel(filament) {
  return [filament.brand, filament.material, filament.color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ") || "este filamento";
}
