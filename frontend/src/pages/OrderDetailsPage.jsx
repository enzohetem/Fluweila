import { ArrowLeft, ListChecks, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { JOB_STATUSES, ORDER_STATUSES, labelFor } from "../constants.js";
import { useToast } from "../feedback/ToastProvider.jsx";
import { formatDate, statusTone } from "../utils/jobFormatters.js";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const backTo = useMemo(() => location.state?.from || "/orders", [location.state]);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");
      setOrder(await api.get(`/orders/${id}`));
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeOrderStatus(nextStatus) {
    if (order.status === nextStatus) {
      return;
    }

    try {
      setBusy(true);
      setError("");
      await api.patch(`/orders/${id}/status`, { status: nextStatus });
      toast.success("Status do pedido atualizado.");
      await loadOrder();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page detail-page">
      <PageHeader
        title={`Pedido #${id}`}
        actions={
          <>
            <button className="secondary-button" type="button" onClick={() => navigate(backTo)}>
              <ArrowLeft size={18} />
              Voltar
            </button>
            <Link
              className="primary-button"
              to={`/orders/${id}/edit`}
              state={{ from: location.pathname }}
            >
              <Pencil size={18} />
              Editar
            </Link>
          </>
        }
      />

      <StatusMessage loading={loading} error={error} />

      {order ? (
        <>
          <section className="panel detail-hero">
            <div>
              <span className="muted">Cliente</span>
              <h2>{order.customer_name}</h2>
              <div className="detail-badges">
                <Badge tone={statusTone(order.status)}>
                  {labelFor(ORDER_STATUSES, order.status)}
                </Badge>
                <Badge>
                  {(order.printed_jobs || 0)}/{order.total_jobs || 0} impressos
                </Badge>
                <Badge tone="neutral">Entrega {formatDate(order.delivery_date)}</Badge>
              </div>
            </div>
            <div className="detail-actions">
              <SelectField
                value={order.status}
                options={statusOptionsForOrder(order)}
                disabled={!canChangeOrderStatus(order) || busy}
                onChange={changeOrderStatus}
                className={`row-select status-select status-select-${order.status}`}
              />
              <Link className="secondary-button" to="/jobs" state={{ from: location.pathname }}>
                <ListChecks size={18} />
                Ver fila
              </Link>
            </div>
          </section>

          <section className="detail-grid">
            <section className="panel info-panel">
              <div className="panel-header">
                <h2>Itens do pedido</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Filamento</th>
                      <th>Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.product_name}</strong>
                          <span className="muted">{item.product_sku || "-"}</span>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{filamentLabel(item)}</td>
                        <td>{item.estimated_time_minutes || 0} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel info-panel">
              <div className="panel-header">
                <h2>Jobs gerados</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Impressora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.jobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <Link to={`/jobs/${job.id}`}>
                            <strong>#{job.id} - {job.product_name}</strong>
                          </Link>
                          <span className="muted">Unidade {job.unit_index || "-"}</span>
                        </td>
                        <td>
                          <Badge tone={statusTone(job.status)}>
                            {labelFor(JOB_STATUSES, job.status)}
                          </Badge>
                        </td>
                        <td>{job.printer_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </>
      ) : null}
    </section>
  );
}

function filamentLabel(item) {
  return [item.filament_brand, item.filament_material, item.filament_color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ") || "-";
}

function canChangeOrderStatus(order) {
  return ["ready_to_pack", "packed"].includes(order.status);
}

function statusOptionsForOrder(order) {
  if (order.status === "ready_to_pack") {
    return ORDER_STATUSES.filter((item) =>
      ["ready_to_pack", "packed"].includes(item.value),
    );
  }

  if (order.status === "packed") {
    return ORDER_STATUSES.filter((item) =>
      ["packed", "completed"].includes(item.value),
    );
  }

  return ORDER_STATUSES.filter((item) => item.value === order.status);
}
