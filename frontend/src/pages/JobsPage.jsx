import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { JOB_PRIORITIES, JOB_STATUSES, labelFor } from "../constants.js";
import { useConfirm } from "../feedback/ConfirmProvider.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";
import {
  filamentLabel,
  formatDate,
  priorityTone,
  productVariationLabel,
} from "../utils/jobFormatters.js";

const QUEUE_STATUS_OPTIONS = JOB_STATUSES.filter(
  (status) => status.value !== "printed",
);
const QUEUE_STATUS_VALUES = new Set(QUEUE_STATUS_OPTIONS.map((status) => status.value));

function normalizeQueueStatus(status) {
  return QUEUE_STATUS_VALUES.has(status) ? status : "";
}

export default function JobsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    normalizeQueueStatus(searchParams.get("status") || ""),
  );
  const [loading, setLoading] = useState(true);
  const [busyJobId, setBusyJobId] = useState(null);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    loadJobs();
  }, [page, status]);

  async function loadJobs() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (status) params.set("status", status);
      if (search) params.set("search", search);

      const result = await api.get(`/jobs?${params.toString()}`);
      setJobs(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(job, nextStatus) {
    if (job.status === nextStatus) {
      return;
    }

    try {
      setBusyJobId(job.id);
      setError("");
      await api.patch(`/jobs/${job.id}/status`, { status: nextStatus });
      toast.success(`Status de ${job.customer_name || job.title} atualizado.`);
      await loadJobs();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusyJobId(null);
    }
  }

  async function deleteJob(job) {
    const confirmed = await confirm({
      title: "Remover pedido",
      message: `Deseja remover o pedido de ${job.customer_name || job.title}?`,
      confirmLabel: "Remover",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyJobId(job.id);
      setError("");
      await api.delete(`/jobs/${job.id}`);
      toast.success("Pedido removido.");
      await loadJobs();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusyJobId(null);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    loadJobs();
  }

  return (
    <section className="page jobs-page">
      <PageHeader
        title="Fila de impressão"
        actions={
          <Link
            className="primary-button"
            to="/jobs/new"
            state={{ from: location.pathname }}
          >
            <Plus size={18} />
            Novo pedido
          </Link>
        }
      />

      <section className="panel jobs-list-panel">
        <div className="panel-header">
          <h2>Pedidos</h2>
          <form className="toolbar" onSubmit={submitSearch}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente, produto ou material"
            />
            <SelectField
              value={status}
              options={[{ value: "", label: "Todos" }, ...QUEUE_STATUS_OPTIONS]}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
                if (value) {
                  setSearchParams({ status: value });
                } else {
                  setSearchParams({});
                }
              }}
              className="toolbar-select"
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
          <table className="queue-table">
            <thead>
              <tr>
                <th>Prioridade</th>
                <th>Nome do cliente</th>
                <th>Produto</th>
                <th>Variação</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="queue-row">
                  <td>
                    <div className="queue-cell-stack">
                      <Badge tone={priorityTone(job.priority)}>
                        {labelFor(JOB_PRIORITIES, job.priority)}
                      </Badge>
                      <span className="muted">
                        {formatDate(job.delivery_date)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <Link
                      className="row-main-link"
                      to={`/jobs/${job.id}`}
                      state={{ from: location.pathname }}
                    >
                      <strong>{job.customer_name || job.title}</strong>
                      <span className="muted">
                        {job.order_number ? `Pedido #${job.order_number}` : "Job avulso"}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <div className="queue-cell-stack">
                      <strong>{job.product_name || "-"}</strong>
                      <span className="muted">{job.product_sku || "-"}</span>
                    </div>
                  </td>
                  <td>
                    <span className="queue-cell-text">
                      {productVariationLabel(job) || filamentLabel(job) || "-"}
                    </span>
                  </td>
                  <td>
                    <SelectField
                      value={job.status}
                      options={JOB_STATUSES}
                      disabled={busyJobId === job.id}
                      onChange={(value) => changeStatus(job, value)}
                      className={`row-select status-select status-select-${job.status}`}
                    />
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="secondary-button compact-button"
                        to={`/jobs/${job.id}`}
                        state={{ from: location.pathname }}
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                        Detalhes
                      </Link>
                      <Link
                        className="compact-button"
                        to={`/jobs/${job.id}/edit`}
                        state={{ from: location.pathname }}
                        title="Editar pedido"
                      >
                        <Pencil size={16} />
                        Editar
                      </Link>
                      <button
                        className="icon-button danger"
                        type="button"
                        title="Remover"
                        aria-label="Remover"
                        disabled={busyJobId === job.id}
                        onClick={() => deleteJob(job)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <StatusMessage empty={!loading && jobs.length === 0} />
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>
    </section>
  );
}
