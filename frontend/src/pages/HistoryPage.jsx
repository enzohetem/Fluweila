import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { JOB_PRIORITIES, JOB_STATUSES, labelFor } from "../constants.js";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, [page, status]);

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (status) params.set("status", status);
      if (search) params.set("search", search);

      const result = await api.get(`/jobs/history?${params.toString()}`);
      setItems(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    loadHistory();
  }

  return (
    <section className="page">
      <PageHeader title="Histórico" />

      <section className="panel">
        <div className="panel-header">
          <h2>Pedidos finalizados</h2>
          <form className="toolbar" onSubmit={submitSearch}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" />
            <SelectField
              value={status}
              options={[
                { value: "", label: "Todos" },
                ...JOB_STATUSES.filter((item) => item.value === "printed"),
              ]}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              className="toolbar-select"
            />
            <button className="icon-button" type="submit" title="Atualizar" aria-label="Atualizar">
              <RefreshCw size={18} />
            </button>
          </form>
        </div>

        <StatusMessage loading={loading} error={error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Entrega</th>
                <th>Produto</th>
                <th>Impressora</th>
                <th>Variação</th>
                <th>Finalizado em</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.customer_name || job.title}</strong>
                    <span className="muted">{job.description || "-"}</span>
                  </td>
                  <td><Badge tone="success">{labelFor(JOB_STATUSES, job.status)}</Badge></td>
                  <td><Badge>{labelFor(JOB_PRIORITIES, job.priority)}</Badge></td>
                  <td>{formatDate(job.delivery_date)}</td>
                  <td>{job.product_name || job.file_name || "-"}</td>
                  <td>{job.printer_name || "-"}</td>
                  <td>{productVariationLabel(job) || job.filament_name || "-"}</td>
                  <td>{job.finished_at ? new Date(job.finished_at).toLocaleString("pt-BR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <StatusMessage empty={!loading && items.length === 0} />
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>
    </section>
  );
}

function productVariationLabel(job) {
  return [job.filament_brand, job.filament_material, job.filament_color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
